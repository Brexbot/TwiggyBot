data "archive_file" "archive_file" {
  type        = "zip"
  source_file = "lambda.py"
  output_path = "lambda.zip"
}

resource "aws_lambda_function" "lambda_function" {
  architectures = ["arm64"]
  filename      = "lambda.zip"
  function_name = "fargate-fallback"
  role          = aws_iam_role.lambda.arn
  handler       = "lambda.handler"

  source_code_hash = data.archive_file.archive_file.output_base64sha256

  runtime = "python3.11"
}
