target "default" {
  context = "."
  dockerfile = "Dockerfile"
  targets = ["build"]
  tags = ["filehost:latest"]
  no-cache = true
  platforms = ["linux/amd64", "linux/arm64"]
}