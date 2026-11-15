# Deploying to Azure

The public demo runs on Azure Container Apps as a single container (the image from
`Dockerfile`: map client at `/`, API at `/api`). Every push to `main` that passes CI
is built, pushed to Azure Container Registry and rolled out by the `deploy` job in
`.github/workflows/ci.yml`. The job logs in with OIDC, so GitHub holds no Azure password.

The warmed NASA cache (`data/nasa-cache.zip`) is part of the image and is imported on
every start, so both demo seasons work without Earthdata credentials. The credentials
are only needed for the latest season and for fields drawn on the map.

The cache directory (`/app/.cache`) is an Azure Files share, so what the app fetches
from NASA (the latest season, drawn fields) survives restarts and every rollout from
CI. The data does not change once fetched; without the share, each deploy would read
the latest season from NASA again, which takes about 20 minutes on a cold cache.

## Resources

| Resource | Name | Notes |
|---|---|---|
| Resource group | `rg-pollination` | everything below lives here |
| Container registry | see repo variable `AZURE_ACR` | Basic SKU; the app pulls with its managed identity |
| Container Apps environment | `cae-pollination` | Consumption plan, North Europe, Log Analytics workspace |
| Container App | `pollination` | 0.5 vCPU, 1 GiB, external HTTPS ingress on port 8000, 1 replica |
| Storage account | `stpollination627b46` | Standard LRS; file share `nasa-cache` (5 GiB) mounted at `/app/.cache` |
| Entra app | `gh-pollination-deploy` | federated credential for `main`, Contributor on the resource group |

`max-replicas` must stay 1: grower verifications and the latest-season fetch live in
process memory. `min-replicas 1` avoids a cold start for visitors; set it to 0 to stay
inside the monthly free grant when nobody is looking:

```sh
az containerapp update -g rg-pollination -n pollination --min-replicas 0
```

## One-time setup

Needs the Azure CLI (`az login`) and `gh` with write access to the repository.
West Europe did not accept new trial customers, hence North Europe.

```sh
LOC=northeurope RG=rg-pollination ACR=pollination$(openssl rand -hex 3)
az group create -n $RG -l $LOC
az acr create -g $RG -n $ACR -l $LOC --sku Basic
az containerapp env create -g $RG -n cae-pollination -l $LOC

# First image (later ones come from CI)
az acr login -n $ACR
docker buildx build --platform linux/amd64 -t $ACR.azurecr.io/happybee:initial --push .

az containerapp create -g $RG -n pollination --environment cae-pollination \
  --image $ACR.azurecr.io/happybee:initial \
  --registry-server $ACR.azurecr.io --registry-identity system \
  --ingress external --target-port 8000 \
  --cpu 0.5 --memory 1.0Gi --min-replicas 1 --max-replicas 1

# GitHub Actions identity (OIDC)
APPID=$(az ad app create --display-name gh-pollination-deploy --query appId -o tsv)
az ad sp create --id $APPID
az ad app federated-credential create --id $APPID --parameters '{"name":"main",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:gabboraron/NASA_SpaceAppsChallange2026-Terra_and_Luna_Analytics:ref:refs/heads/main",
  "audiences":["api://AzureADTokenExchange"]}'
az role assignment create --assignee $APPID --role Contributor \
  --scope $(az group show -n $RG --query id -o tsv)

gh variable set AZURE_CLIENT_ID -b $APPID
gh variable set AZURE_TENANT_ID -b $(az account show --query tenantId -o tsv)
gh variable set AZURE_SUBSCRIPTION_ID -b $(az account show --query id -o tsv)
gh variable set AZURE_RESOURCE_GROUP -b $RG
gh variable set AZURE_CONTAINERAPP -b pollination
gh variable set AZURE_ACR -b $ACR
```

## Persistent NASA cache

The Microsoft.Storage provider has to be registered once per subscription. The share
is linked to the environment, then mounted into the app owned by the image's `app`
user (uid 10001). The CI rollout (`az containerapp update --image`) keeps the mount.

```sh
RG=rg-pollination ST=stpollination627b46
az provider register -n Microsoft.Storage --wait
az storage account create -g $RG -n $ST -l northeurope --sku Standard_LRS \
  --kind StorageV2 --https-only true --min-tls-version TLS1_2 \
  --allow-blob-public-access false
az storage share-rm create -g $RG --storage-account $ST -n nasa-cache --quota 5
az containerapp env storage set -g $RG -n cae-pollination --storage-name nasacache \
  --azure-file-account-name $ST --azure-file-share-name nasa-cache --access-mode ReadWrite \
  --azure-file-account-key "$(az storage account keys list -g $RG -n $ST --query '[0].value' -o tsv)"
```

Then add the volume and mount to the app's YAML (`az containerapp show -g $RG -n pollination -o yaml`)
and apply it with `az containerapp update -g $RG -n pollination --yaml app.yaml`:

```yaml
properties:
  template:
    containers:
      - name: pollination
        volumeMounts:
          - volumeName: nasa-cache
            mountPath: /app/.cache
    volumes:
      - name: nasa-cache
        storageType: AzureFile
        storageName: nasacache
        mountOptions: uid=10001,gid=10001,dir_mode=0750,file_mode=0640
```

## Earthdata credentials

Stored as Container App secrets, never in git or GitHub. From a shell that has the
values in `.env`:

```sh
set -a; . ./.env; set +a
az containerapp secret set -g rg-pollination -n pollination \
  --secrets earthdata-token="$EARTHDATA_TOKEN"
az containerapp update -g rg-pollination -n pollination \
  --set-env-vars EARTHDATA_TOKEN=secretref:earthdata-token
```

## Domain

The app's free address is `https://pollination.<id>.northeurope.azurecontainerapps.io`
(`az containerapp show -g rg-pollination -n pollination --query properties.configuration.ingress.fqdn`),
with a managed TLS certificate. Azure has no free custom domains; for one you own, add a
CNAME and a TXT record, then `az containerapp hostname add` and `az containerapp hostname bind`
with a free managed certificate.

## Cost on a free trial

The trial credit runs out after 30 days. Upgrade the subscription to pay-as-you-go before
then or Azure disables it and the demo goes offline. After that, the registry is about
5 USD a month, the cache share a few cents, and the app stays within the Container Apps free grant with `--min-replicas 0`.
