# Tabby — CloudFront/S3 to Cloudflare Migration Todo

See [cloudfront-to-cloudflare-migration.md](cloudfront-to-cloudflare-migration.md) for full context and rationale.

---

### Destroy Old AWS Resources

- [x] ~~Destroy existing CloudFront/S3 Terraform resources~~ — S3 bucket already deleted manually; CloudFront never created

### Terraform Cloud Setup

- [x] Sign up at [app.terraform.io](https://app.terraform.io) and create organization (`dzhao-projects`)
- [x] Create a CLI-driven workspace (`tabby-workspace`)
- [x] Update `infra/main.tf` with organization name
- [x] Run `terraform login` to authenticate locally
- [x] Run `terraform init` and import all 15 existing AWS resources into Terraform Cloud state
- [x] Run `terraform apply` — CORS origin updated to `https://tabby.pages.dev`
- [x] ~~Delete the old S3 state bucket~~ — already deleted manually
- [x] Add workspace variables: `neon_database_url`, `cookie_secret`, `cors_origin`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

### Cloudflare Pages Setup

- [x] Create a Cloudflare account
- [x] Create an API token (`github-pages-deploy`) with `Pages:Edit` permission
- [x] Note account ID
- [x] Create Cloudflare Pages project (`tabby`)

### Update GitHub Secrets

Remove:
- [x] `PROD_CF_DISTRIBUTION_ID`
- [x] `TF_STATE_BUCKET`

Add:
- [x] `CLOUDFLARE_API_TOKEN`
- [x] `CLOUDFLARE_ACCOUNT_ID`
- [x] `TF_API_TOKEN`

Update:
- [x] `PROD_CORS_ORIGIN` → `https://tabby.pages.dev`

### Apply Infrastructure & Deploy

- [x] Terraform apply completed with new CORS origin
- [ ] Push a `v*` tag to trigger the production workflow
- [ ] Verify the GitHub Actions workflow runs green

### Post-Migration Validation

- [ ] `https://tabby.pages.dev` loads the app
- [ ] SPA routing works (navigate to a deep link and refresh — should not 404)
- [ ] API calls work (no CORS errors in the browser console)
- [ ] SSM parameter `cors_origin` is set to `https://tabby.pages.dev`
- [ ] Lambda returns correct `Access-Control-Allow-Origin` header
- [ ] `terraform plan` shows no unexpected changes
- [ ] No orphaned AWS resources remain (check console for leftover S3 buckets, CloudFront distributions, ACM certificates)

### Custom Domain (Optional)

- [ ] Add your domain to Cloudflare (free plan)
- [ ] In Pages project settings, go to **Custom domains** and add your domain
- [ ] Cloudflare handles DNS and HTTPS automatically
- [ ] Update `PROD_CORS_ORIGIN` to match the custom domain
