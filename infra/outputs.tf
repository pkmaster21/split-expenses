output "cloudfront_url" {
  description = "CloudFront distribution URL for the React PWA"
  value       = module.cloudfront.url
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.url
}
