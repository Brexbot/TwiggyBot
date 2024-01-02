resource "aws_ecs_cluster" "ecs_cluster" {
  name = "twiggy"
}

resource "aws_ecs_service" "ecs_primary_service" {
  name    = "twiggy-primary"
  cluster = aws_ecs_cluster.ecs_cluster.arn

  desired_count = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }
  platform_version                   = "LATEST"
  task_definition                    = aws_ecs_task_definition.ecs_task_definition.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  enable_execute_command             = true
  propagate_tags                     = "SERVICE"

  network_configuration {
    assign_public_ip = true
    subnets = [
      aws_subnet.subnet.id
    ]
    security_groups = [
      aws_security_group.security_group.id
    ]
  }
  health_check_grace_period_seconds = 0
  scheduling_strategy               = "REPLICA"

  lifecycle {
    ignore_changes = [capacity_provider_strategy]
  }
}

resource "aws_ecs_service" "ecs_fallback_service" {
  name    = "twiggy-fallback"
  cluster = aws_ecs_cluster.ecs_cluster.arn

  desired_count = 0
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
  platform_version                   = "LATEST"
  task_definition                    = aws_ecs_task_definition.ecs_task_definition.arn
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  enable_execute_command             = true
  propagate_tags                     = "SERVICE"

  network_configuration {
    assign_public_ip = true
    subnets = [
      aws_subnet.subnet.id
    ]
    security_groups = [
      aws_security_group.security_group.id
    ]
  }
  health_check_grace_period_seconds = 0
  scheduling_strategy               = "REPLICA"
}

resource "aws_ecs_task_definition" "ecs_task_definition" {
  family             = "twiggy"
  task_role_arn      = aws_iam_role.ecs_task_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  network_mode       = "awsvpc"
  requires_compatibilities = [
    "FARGATE"
  ]
  cpu    = "256"
  memory = "512"
  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"
  }
  container_definitions = jsonencode([
    {
      name : "twiggy"
      essential : true
      image : "${aws_ecr_repository.ecr_repository.repository_url}:twiggy"
      logConfiguration : {
        logDriver : "awslogs"
        options : {
          awslogs-create-group : "true"
          awslogs-group : aws_cloudwatch_log_group.cloudwatch_log_group_ecs.name
          awslogs-region : "eu-west-1"
          awslogs-stream-prefix : "twiggy"
        }
      },
      secrets : [
        {
          "name" : "DISCORD_TOKEN",
          "valueFrom" : aws_ssm_parameter.ssm_parameter_discord_token.arn
        },
        {
          "name" : "ITAD_TOKEN",
          "valueFrom" : aws_ssm_parameter.ssm_parameter_itad_token.arn
        },
        {
          "name" : "TWITCH_SECRET",
          "valueFrom" : aws_ssm_parameter.ssm_parameter_twitch_secret.arn
        },
        {
          "name" : "TWITCH_CLIENT_ID",
          "valueFrom" : aws_ssm_parameter.ssm_parameter_twitch_client_id.arn
        },
        {
          "name" : "OPEN_WEATHER_TOKEN",
          "valueFrom" : aws_ssm_parameter.ssm_parameter_open_weather_token.arn
        }
      ]
    }
  ])
}
