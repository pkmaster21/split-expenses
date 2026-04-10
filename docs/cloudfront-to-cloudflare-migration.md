# Migration: CloudFront/S3 to Cloudflare Pages + Terraform Cloud

## TODO

- [ ] Step 1: Destroy existing CloudFront/S3 Terraform resources *(manual)*
- [x] Step 2: Remove CloudFront module from Terraform code
- [ ] Step 3: Create Cloudflare Pages project *(manual)*
- [x] Step 4: Update GitHub Actions workflow (`production.yml`)
- [ ] Step 5: Update GitHub secrets (remove old, add new) *(manual)*
- [ ] Step 6: Re-run Terraform apply with new CORS origin *(manual)*
- [x] Step 7: Update TODO.md, design doc, and README
- [ ] Step 8: Create Terraform Cloud workspace *(manual)*
- [x] Step 9: Update `infra/main.tf` backend to Terraform Cloud
- [x] Step 10: Update CI workflow for Terraform Cloud
- [ ] Step 11: Migrate Terraform state from S3 to Terraform Cloud *(manual)*
- [ ] Step 12: Delete S3 state bucket *(manual)*
- [ ] Step 13: Post-migration validation *(manual)*
- [ ] (Optional) Configure custom domain *(manual)*

---

This document covers two migrations to eliminate AWS services with expiring free tiers:

1. **Frontend hosting:** CloudFront + S3 → Cloudflare Pages (unlimited free bandwidth)
2. **Terraform state:** S3 backend → Terraform Cloud (free for up to 500 resources)

---

## Prerequisites

- Cloudflare account (free)
- Cloudflare Pages project created (e.g. `tabby`)
- Cloudflare API token with `Pages:Edit` permission
- Cloudflare account ID (found in the dashboard URL or sidebar)

---

## Step 1: Destroy existing CloudFront/S3 resources

Since the CloudFront distribution failed to create (account verification), only the S3 bucket and related resources exist. Run:

```bash
cd infra
terraform destroy -target=module.cloudfront \
  -var="neon_database_url=<your-neon-url>" \
  -var="cookie_secret=<your-secret>" \
  -var="cors_origin=https://placeholder.cloudfront.net"
```

---

## Step 2: Remove Terraform CloudFront module

### Delete the module directory

```
rm -rf infra/modules/cloudfront/
```

### Update `infra/main.tf`

Remove the cloudfront module block (lines 58-63):

```diff
-module "cloudfront" {
-  source    = "./modules/cloudfront"
-  prefix    = local.prefix
-  tags      = local.tags
-  providers = { aws.us_east_1 = aws.us_east_1 }
-}
```

Remove the `us_east_1` provider alias if no other module uses it (lines 19-22):

```diff
-provider "aws" {
-  alias  = "us_east_1"
-  region = "us-east-1"
-}
```

### Update `infra/outputs.tf`

Replace the `cloudfront_url` output:

```diff
-output "cloudfront_url" {
-  description = "CloudFront distribution URL for the React PWA"
-  value       = module.cloudfront.url
-}
```

---

## Step 3: Create Cloudflare Pages project

This can be done manually in the Cloudflare dashboard or via Wrangler CLI:

```bash
npx wrangler pages project create tabby --production-branch main
```

The project URL will be `https://tabby.pages.dev`.

---

## Step 4: Update GitHub Actions workflow

### Update environment variables in `production.yml`

Remove the S3 and CloudFront env vars:

```diff
 env:
   AWS_REGION: us-east-1
   LAMBDA_FUNCTION: tabby-prod-api
-  S3_BUCKET: tabby-prod-web-assets
-  CLOUDFRONT_DISTRIBUTION: ${{ secrets.PROD_CF_DISTRIBUTION_ID }}
```

### Replace the S3 sync and CloudFront invalidation steps

Remove these steps from the `deploy-app` job:

```diff
-    - name: Sync to S3
-      run: |
-        aws s3 sync packages/web/dist s3://$S3_BUCKET \
-          --delete \
-          --cache-control "public,max-age=31536000,immutable" \
-          --exclude "index.html"
-        aws s3 cp packages/web/dist/index.html s3://$S3_BUCKET/index.html \
-          --cache-control "public,max-age=0,must-revalidate"
-
-    - name: Invalidate CloudFront
-      run: |
-        aws cloudfront create-invalidation \
-          --distribution-id $CLOUDFRONT_DISTRIBUTION \
-          --paths "/*"
```

Add the Cloudflare Pages deploy step:

```diff
+    - name: Deploy to Cloudflare Pages
+      uses: cloudflare/wrangler-action@v3
+      with:
+        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
+        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
+        command: pages deploy packages/web/dist --project-name=tabby
```

---

## Step 5: Update GitHub secrets

### Remove

| Secret                    | Reason                          |
|---------------------------|---------------------------------|
| `PROD_CF_DISTRIBUTION_ID` | No longer using CloudFront      |
| `TF_STATE_BUCKET`         | No longer using S3 for state    |

### Add

| Secret                  | Value                                        |
|-------------------------|----------------------------------------------|
| `CLOUDFLARE_API_TOKEN`  | API token with `Pages:Edit` permission       |
| `CLOUDFLARE_ACCOUNT_ID` | From Cloudflare dashboard                    |
| `TF_API_TOKEN`          | From Terraform Cloud → User Settings → Tokens |

### Update

| Secret             | New value                                         |
|--------------------|---------------------------------------------------|
| `PROD_CORS_ORIGIN` | `https://tabby.pages.dev` (or your custom domain) |

---

## Step 6: Update CORS origin in SSM

Re-run Terraform apply with the new CORS origin:

```bash
cd infra
terraform apply \
  -var="neon_database_url=<your-neon-url>" \
  -var="cookie_secret=<your-secret>" \
  -var="cors_origin=https://tabby.pages.dev"
```

---

## Step 7: Update TODO.md, design doc, and README

### Why Cloudflare Pages?

AWS CloudFront + S3 hosting falls under the AWS Free Tier, which expires after 12 months. Cloudflare Pages offers unlimited bandwidth and requests on its free plan with **no expiration**. It also simplifies deployment (single `wrangler` command vs. S3 sync + cache invalidation) and provides built-in custom domain support with automatic HTTPS — no ACM certificates or Route 53 needed.

### Why Terraform Cloud?

The S3 backend for Terraform state is another AWS service subject to the expiring free tier. Terraform Cloud is free for up to 500 managed resources and provides state locking, versioning, and a UI for state inspection out of the box — without maintaining an S3 bucket and DynamoDB table.

### TODO.md

Remove references to:
- `PROD_CF_DISTRIBUTION_ID` secret
- CloudFront URL from Terraform outputs
- Re-running apply with CloudFront `cors_origin`

Add references to:
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets
- Cloudflare Pages project setup

### Design doc and README

Update both to reflect:
- Frontend is hosted on Cloudflare Pages (`https://tabby.pages.dev`), not CloudFront + S3
- Terraform state is stored in Terraform Cloud, not an S3 bucket
- Deployment uses `wrangler pages deploy`, not `aws s3 sync`
- Include the rationale above (free tier permanence, simpler deployment)

---

## Custom domain (optional)

Cloudflare Pages supports free custom domains:

1. Add your domain to Cloudflare (free plan)
2. In Pages project settings, go to **Custom domains** and add your domain
3. Cloudflare handles DNS and HTTPS automatically
4. Update `PROD_CORS_ORIGIN` to match the custom domain

This replaces the ACM certificate + Route 53 setup that would have been needed with CloudFront.

---

## Summary of changes

| Area              | Before                              | After                              |
|-------------------|-------------------------------------|------------------------------------|
| Frontend hosting  | CloudFront + S3                     | Cloudflare Pages                   |
| Deploy method     | `aws s3 sync` + CF invalidation     | `wrangler pages deploy`            |
| Terraform state   | S3 bucket                           | Terraform Cloud (free)             |
| Terraform modules | `cloudfront` module                 | Removed                            |
| GitHub secrets    | `PROD_CF_DISTRIBUTION_ID`, `TF_STATE_BUCKET` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TF_API_TOKEN` |
| Free tier         | Expires after 12 months (bandwidth) | Unlimited, no expiration           |
| Custom domain     | ACM + Route 53                      | Built-in, free                     |

**No changes needed to:** Lambda, API Gateway, SSM module, backend code, or frontend code.

---

## Optional: Migrate Terraform state to Terraform Cloud

This removes the last S3 dependency, making the entire stack free with no expiring tiers.

### Step 8: Create Terraform Cloud workspace

1. Sign up at [app.terraform.io](https://app.terraform.io) (free)
2. Create an organization (e.g. `your-org`)
3. Create a workspace named `tabby` with **CLI-driven** execution mode

### Step 9: Update `infra/main.tf`

Replace the S3 backend with the Terraform Cloud backend:

```diff
-  backend "s3" {
-    key    = "tabby/terraform.tfstate"
-    region = "us-east-1"
-  }
+  cloud {
+    organization = "your-org"
+    workspaces {
+      name = "tabby"
+    }
+  }
```

### Step 10: Update CI workflow

In `production.yml`, update both `terraform init` steps to remove the bucket config:

```diff
-        run: terraform init -backend-config="bucket=${{ secrets.TF_STATE_BUCKET }}"
+        run: terraform init
```

Add `TF_API_TOKEN` as an environment variable to the Terraform jobs:

```diff
+        env:
+          TF_TOKEN_app_terraform_io: ${{ secrets.TF_API_TOKEN }}
```

### Step 11: Migrate state locally

Run once to move existing state from S3 to Terraform Cloud:

```bash
cd infra
terraform login
terraform init
```

Terraform will detect the backend change and prompt to migrate the state. Type `yes`.

### Step 12: Delete the S3 state bucket

After confirming the state migrated successfully:

```bash
aws s3 rb s3://<your-tf-state-bucket> --force
```

---

## Step 13: Post-migration validation

Run through each check to make sure nothing is broken.

### Infrastructure

- [ ] `cd infra && terraform plan` shows no unexpected changes
- [ ] Terraform state is accessible in Terraform Cloud (check the UI at app.terraform.io)
- [ ] No remaining references to S3 backend in `infra/main.tf`
- [ ] No remaining `cloudfront` module directory or references in `infra/main.tf`
- [ ] The `us_east_1` provider alias is removed (if no other module uses it)

### CI/CD

- [ ] `production.yml` has no references to `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION`, or `TF_STATE_BUCKET`
- [ ] `production.yml` uses `wrangler pages deploy` for frontend deployment
- [ ] `production.yml` passes `TF_TOKEN_app_terraform_io` to Terraform jobs
- [ ] `terraform init` steps no longer use `-backend-config="bucket=..."`
- [ ] Push a commit and verify the GitHub Actions workflow runs green end-to-end

### GitHub secrets

- [ ] `PROD_CF_DISTRIBUTION_ID` and `TF_STATE_BUCKET` are removed
- [ ] `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `TF_API_TOKEN` are added
- [ ] `PROD_CORS_ORIGIN` is updated to `https://tabby.pages.dev`

### Frontend

- [ ] Cloudflare Pages deployment succeeds (`https://tabby.pages.dev` loads the app)
- [ ] SPA routing works (navigate to a deep link and refresh — should not 404)
- [ ] API calls work (no CORS errors in the browser console)

### Backend

- [ ] SSM parameter `cors_origin` is set to `https://tabby.pages.dev`
- [ ] Lambda function returns correct `Access-Control-Allow-Origin` header
- [ ] API Gateway endpoints respond normally

### Docs

- [ ] TODO.md is updated (no CloudFront references, Cloudflare secrets documented)
- [ ] Design doc reflects Cloudflare Pages and Terraform Cloud
- [ ] README reflects the new hosting and state setup

### Cleanup

- [ ] S3 state bucket is deleted
- [ ] S3 web assets bucket is deleted (destroyed via `terraform destroy -target`)
- [ ] No orphaned AWS resources remain (check the AWS console for leftover S3 buckets, CloudFront distributions, or ACM certificates)
