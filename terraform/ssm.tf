resource "aws_ssm_parameter" "ssm_parameter_discord_token" {
  name  = "/twiggy/discord_token"
  type  = "SecureString"
  value = "TODO"
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "aws_ssm_parameter" "ssm_parameter_itad_token" {
  name  = "/twiggy/itad_token"
  type  = "SecureString"
  value = "TODO"
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "aws_ssm_parameter" "ssm_parameter_twitch_secret" {
  name  = "/twiggy/twitch_secret"
  type  = "SecureString"
  value = "TODO"
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "aws_ssm_parameter" "ssm_parameter_twitch_client_id" {
  name  = "/twiggy/twitch_client_id"
  type  = "SecureString"
  value = "TODO"
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "aws_ssm_parameter" "ssm_parameter_open_weather_token" {
  name  = "/twiggy/open_weather_token"
  type  = "SecureString"
  value = "TODO"
  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
