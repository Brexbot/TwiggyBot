terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31.0"
    }
  }

  required_version = "~> 1.6.0"
}

provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      terraform = "1"
    }
  }
}
