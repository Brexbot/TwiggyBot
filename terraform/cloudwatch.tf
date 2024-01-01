resource "aws_cloudwatch_log_group" "cloudwatch_log_group_ecs" {
  name              = "TwiggyBot"
  retention_in_days = 7
}
