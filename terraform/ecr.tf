resource "aws_ecr_repository" "ecr_repository" {
  name = "twiggy"
}

resource "aws_ecr_lifecycle_policy" "ecr_lifecycle_policy" {
  repository = aws_ecr_repository.ecr_repository.name

  policy = jsonencode({
    rules : [
      {
        rulePriority : 1
        description : "Delete untagged images"
        selection : {
          tagStatus : "untagged"
          countType : "sinceImagePushed"
          countUnit : "days"
          countNumber : 1
        }
        action : {
          type : "expire"
        }
      }
    ]
  })
  depends_on = [aws_ecr_repository.ecr_repository]
}
