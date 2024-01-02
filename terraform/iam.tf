resource "aws_iam_role" "ecs_task_role" {
  name               = "twiggy-ecs_task_role"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy_ecs_tasks.json
  inline_policy {
    name = "ecs-exec"
    policy = jsonencode({
      Statement : [
        {
          Effect : "Allow",
          Action : [
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel"
          ],
          Resource : "*"
        }
      ]
    })
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "twiggy-ecs_task_execution_role"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy_ecs_tasks.json
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  ]
  inline_policy {
    name = "systems-manager-parameter-store-access"
    policy = jsonencode({
      Statement : [
        {
          Effect : "Allow",
          Action : "ssm:GetParameter",
          Resource : "arn:aws:ssm:eu-west-1:866826529066:/twiggy/*"
        }
      ]
    })
  }
}

resource "aws_iam_role" "lambda" {
  name               = "twiggy-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy_lambda.json
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
  ]
  inline_policy {
    name = "ecs-update-service"
    policy = jsonencode({
      Statement : [
        {
          Effect : "Allow",
          Action : [
            "ecs:DescribeServices",
            "ecs:UpdateService",
          ],
          Resource = [
            aws_ecs_service.ecs_primary_service.id,
            aws_ecs_service.ecs_fallback_service.id,
          ]
        }
      ]
    })
  }
}
