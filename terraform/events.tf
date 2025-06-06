resource "aws_cloudwatch_event_rule" "cloudwatch_event_rule" {
  name_prefix = "ecs-fargate-fallback-rule"
  event_pattern = jsonencode({
    source : [
      "aws.ecs"
    ],
    detail-type : [
      "ECS Service Action"
    ],
    resources : [
      aws_ecs_service.ecs_primary_service.id
    ]
    detail : {
      eventName : ["SERVICE_STEADY_STATE", "SERVICE_TASK_PLACEMENT_FAILURE"],
    }
  })
}

resource "aws_cloudwatch_event_target" "cloudwatch_event_target" {
  arn  = aws_lambda_function.lambda_function.arn
  rule = aws_cloudwatch_event_rule.cloudwatch_event_rule.id

  input_transformer {
    input_paths = {
      event_name = "$.detail.eventName"
    }
    input_template = <<EOF
      {
        "cluster_arn": "${aws_ecs_cluster.ecs_cluster.arn}",
        "primary_service_arn": "${aws_ecs_service.ecs_primary_service.id}",
        "fallback_service_arn": "${aws_ecs_service.ecs_fallback_service.id}",
        "event_name": "<event_name>"
      }
    EOF
  }
}
