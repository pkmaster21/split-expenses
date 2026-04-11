variable "prefix" { type = string }
variable "tags" { type = map(string) }
variable "ssm_path_prefix" { type = string }
variable "environment" { type = string }
variable "alarm_actions" {
  type    = list(string)
  default = []
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.prefix}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameter"]
    resources = [
      "arn:aws:ssm:*:*:parameter${var.ssm_path_prefix}",
      "arn:aws:ssm:*:*:parameter${var.ssm_path_prefix}/*",
    ]
  }
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${var.prefix}-lambda-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_policy.json
}

data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'placeholder' });"
    filename = "lambda.js"
  }
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.prefix}-api"
  role             = aws_iam_role.lambda.arn
  handler          = "lambda.lambdaHandler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      NODE_ENV        = var.environment
      SSM_PATH_PREFIX = var.ssm_path_prefix
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${var.prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda error rate exceeded"
  alarm_actions       = var.alarm_actions
  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "latency" {
  alarm_name          = "${var.prefix}-lambda-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 2000
  alarm_description   = "Lambda p99 latency exceeded 2s"
  alarm_actions       = var.alarm_actions
  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }
  tags = var.tags
}

output "function_arn" {
  value = aws_lambda_function.api.arn
}

output "function_name" {
  value = aws_lambda_function.api.function_name
}
