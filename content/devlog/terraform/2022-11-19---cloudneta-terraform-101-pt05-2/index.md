---
title: "[CloudNet@] 테라폼 스터디 5주차 - Terraform의 반복문과 조건문 (2) - 조건문"
date: "2022-11-19T23:52:57.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-11-19-cloudneta-terraform-101-pt05-2"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform의 타입과 값이 어떻게 쓰이는지 알고있다는 가정 하에, 반복문과 조건문을 사용하여 로직을 표현하는 방법을 담았습니다. 그 중, 조건문을 살펴봅시다."
socialImage: "./media/terraform05.jpg"
---

이 내용은 CloudNet@ 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

---

# Prerequisites

- [Terraform: Types and Values](https://developer.hashicorp.com/terraform/language/expressions/types) 공식문서
  - 타입과 값에는 어떤 것들이 사용될 수 있는지 확인해봅시다.
- `count`, `for_each` 는 `resource` 내에서 사용될 수 있습니다.
- `for` 표현식은 복잡한 타입을 또다른 복잡한 타입으로 변환하는데 쓰입니다.

아래에서 5주차 스터디 내용을 공유합니다.

교재의 5장 내용을 다루고 있습니다.

# 본문

테라폼을 통해 마치 프로그램을 작성하듯 코드를 작성할 수 있습니다. 이번 챕터에서는 아래의 내용을 학습할 예정입니다:

- 반복문, 조건문 사용방법
  - 여기서는 조건문에 대해 설명합니다.
- 무중단 배포에 필요한 요소들 사용방법
- 주의사항

## 조건문

테라폼이 제공하는 조건문은 아래와 같이 구성되어 있습니다.

- `count` 매개변수를 이용하여 사용: 조건부 리소스에서 사용
- `for_each` 와 `for` 표현식: 리소스 내의 조건부 리소스, 인라인 블록에 사용
- `if` 문자열 지시자: 문자열 내의 조건문에 사용

### `count` 매개변수

앞서 살펴보았듯, `count` 매개변수를 사용하면 반복문을 사용할 수 있습니다. 이를 응용하여 조건문 작업 또한 수행할 수 있습니다.

#### `count` 매개변수를 사용한 `if` 구문

일부 사용자들에게는 모듈을 생성하고, 나머지 사용자에게는 생성해주지 않기 위해선 **분기 처리**를 수행합니다.

이를 위해서는 Boolean 입력 변수를 변수값으로 추가해주고, 아래와같은 조건 표현식(conditional expression)을 추가합니다.

> ```terraform
> variable "enable_autoscaling" {
>   description = "If set to true, enable auto scaling"
>   type        = bool
> }
>
> <CONDITION> ? <TRUE_VAL> : <FALSE_VAL>
> ```
>
> - `CONDITION`: boolean 판단 조건을 기재합니다.
> - `TRUE_VAL`: 판단 조건이 참일 때의 결과값입니다.
> - `FALSE_VAL`: 판단 조건이 거짓일 때의 결과값입니다.

상기 조건을 조합하면 아래값처럼 `webserver-cluster` 모듈을 업데이트 할 수 있지요.

```terraform
resource "aws_autoscaling_schedule" "scale_out_during_business_hours" {
  # enable_autoscaling 값이 참/거짓일 때에 따라 auto scaling을 허용/불허할 수 있습니다.
  count = var.enable_autoscaling ? 1 : 0

  scheduled_action_name  = "${var.cluster_name}-scale-out-during-business-hours"
  min_size               = 2
  max_size               = 10
  desired_capacity       = 10
  recurrence             = "0 9 * * *" # 이 값은 cron 양식을 따릅니다!
  autoscaling_group_name = aws_autoscaling_group.example.name
}

resource "aws_autoscaling_schedule" "scale_in_at_night" {
  count = var.enable_autoscaling ? 1 : 0

  scheduled_action_name  = "${var.cluster_name}-scale-in-at-night"
  min_size               = 2
  max_size               = 10
  desired_capacity       = 2
  recurrence             = "0 17 * * *"
  autoscaling_group_name = aws_autoscaling_group.example.name
}
```

이러한 조건을 staging 서버에서는 `false`로, production 서버에서는 `true` 로 두기 위해선 아래와 같이 사용하면 됩니다.

- staging 서버의 `main.tf` 파일에서는?

```terraform
module "webserver_cluster" {
  source = "../../../../modules/services/webserver-cluster"

  cluster_name           = "webservers-stage"
  db_remote_state_bucket = "(YOUR_BUCKET_NAME)"
  db_remote_state_key    = "stage/data-stores/mysql/terraform.tfstate"

  instance_type        = "t2.micro"
  min_size             = 2
  max_size             = 2
  # boolean 타입이므로, 해당 값을 지정해서, 설정이 구동되게 지정해줄 수 있습니다.
  enable_autoscaling   = false
}
```

- production 서버의 `main.tf` 파일에서는?

```terraform
module "webserver_cluster" {
  source = "../../../../modules/services/webserver-cluster"

  cluster_name           = "webservers-prod"
  db_remote_state_bucket = "(YOUR_BUCKET_NAME)"
  db_remote_state_key    = "prod/data-stores/mysql/terraform.tfstate"

  instance_type        = "m4.large"
  min_size             = 2
  max_size             = 10
  # boolean 타입이므로, 해당 값을 지정해서, 설정이 구동되게 지정해줄 수 있습니다.
  enable_autoscaling   = true

  custom_tags = {
    Owner     = "team-foo"
    ManagedBy = "terraform"
  }
}
```

#### `count` 매개변수를 사용한 `if-else` 구문

특정 IAM 사용자에게 CloudWatch에 대한 액세스 권한을 부여하는 예시로 살펴보겠습니다. 이 파일은 별도의 정책관련 테라폼 파일로 만들면 되겠지요. (`s3ich4n`이란 유저에 대해 권한을 부여해보죠)

- 읽기 권한만 부여하기 위한 예시값 (`iam_read_only.tf`)

```terraform
resource "aws_iam_policy" "cloudwatch_read_only" {
  name   = "cloudwatch-read-only"
  policy = data.aws_iam_policy_document.cloudwatch_read_only.json
}

data "aws_iam_policy_document" "cloudwatch_read_only" {
  statement {
    effect    = "Allow"
    # cloudwatch의 일부 기능들(read 파트)에 대해서만 권한을 허용하였습니다.
    actions   = [
      "cloudwatch:Describe*",
      "cloudwatch:Get*",
      "cloudwatch:List*"
    ]
    resources = ["*"]
  }
}
```

- 읽기/쓰기 권한을 부여하기 위한 예시값(`iam_rw.tf`)

```terraform
resource "aws_iam_policy" "cloudwatch_full_access" {
  name   = "cloudwatch-full-access"
  policy = data.aws_iam_policy_document.cloudwatch_full_access.json
}

data "aws_iam_policy_document" "cloudwatch_full_access" {
  statement {
    effect    = "Allow"
    # cloudwatch의 전체 기능에 대해 권한을 허용하였습니다.
    actions   = ["cloudwatch:*"]
    resources = ["*"]
  }
}
```

`give_s3ich4n_cloudwatch_full_access` 이라는 변수값에 기반하여, 리소스를 어떻게 적용할지 살펴봅시다.

```terraform
variable "give_s3ich4n_cloudwatch_full_access" {
  description = "If true, s3ich4n gets full access to CloudWatch"
  type        = bool
}
```

리소스 생성 시, 동작수행을 위해 `count` 매개변수와 조건 표현식을 모두 사용해봅시다.

```terraform
resource "aws_iam_user_policy_attachment" "neo_cloudwatch_full_access" {
  count = var.give_neo_cloudwatch_full_access ? 1 : 0

  user       = aws_iam_user.example[0].name
  policy_arn = aws_iam_policy.cloudwatch_full_access.arn
}

resource "aws_iam_user_policy_attachment" "neo_cloudwatch_read_only" {
  count = var.give_neo_cloudwatch_full_access ? 0 : 1

  user       = aws_iam_user.example[0].name
  policy_arn = aws_iam_policy.cloudwatch_read_only.arn
}
```

- 위 코드에는 2개의 `aws_iam_user_policy_attachment` 리소스가 포함되어 있습니다.
- 윗 부분은 전체 액세스 권한을 첨부하는 if절 이고, 아래는 읽기 전용 권한을 첨부하는 else 절입니다.
- 위 접근 방식은 테라폼 코드가 if 나 else 절을 알필요가 없습니다.

### `for_each` 와 `for` 표현식

`for_each` 표현식을 빈 컬렉션으로 전달하면, 0개의 리소스 또는 0개의 인라인 블록을 생성합니다. 비어있지 않은 컬렉션을 전달하면 하나 이상의 리소스 또는 인라인 블록을 만듭니다.

이를 표현하기 위해서는 조건부로 어떻게 표현할까요? `for_each` 표현식과 `for` 표현식을 결합하여 사용할 수 있습니다. 예시값을 살펴보시지요.

```terraform
dynamic "tag" {
    for_each = {
    	for key, value in var.custom_tags:
    	key => upper(value)
    	if key != "Name"
    }

    content {
    	key                 = tag.key
    	value               = tag.value
    	propagate_at_launch = true
    }
}
```

- 중첩된 `for` 표현식은 일관성을 위해 `var.custom_tags` 를 반복하며 각 값을 대문자로 변환하고 모듈이 이미 자체 `Name` 태그를 설정했으므로, `for` 표현식의 조건을 사용하여 `key` 집합을 `Name` 으로 필터링합니다.
- `for` 표현식에서 값을 필터링하여 임의 조건부 논리를 구현할 수 있습니다.
- 리소스의 복사본을 여러 개 만들 때는 count 보다 for_each 를 사용하는 것이 더 낫지만,
  - 조건 논리의 경우 비어 있지 않은 컬렉션에 for_each 를 설정하는 것보다 count 를 `0` 또는 `1`로 설정하는 것이 간단합니다.
- 즉, **리소스를 조건부로 생성**할 때는 **count** 를 사용할 수 있지만, **그 외 모든 유형의 반복문 또는 조건문**에는 **for_each** 를 사용합니다.

### `if` 문자열 지시자

`if` 문자열 지시자를 살펴봅시다.

```terraform
# if 구문의 사용방법 입니다.
%{if <CONDITION> }<TRUEVAL>%{endif}

# if-else 구문의 사용방법입니다.
%{ for <INDEX>, <ITEM> in <COLLECTION> }<BODY>%{if <EXPRESSION>}%{ else }<FALSEVAL>%{ endif }%{ endfor }
```

- COLLECTION: 반복할 리스트, 맵. 말 그대로 반복 가능한 컬렉션을 의미합니다.
- INDEX: 이터레이션 시의 인덱스값을 표현합니다.
- ITEM: 각 항목에 할당할 로컬 변수의 이름입니다.
- BODY: ITEM을 참조할 수 있는 각각의 반복을 렌더링하는 대상입니다.
- EXPRESSION: 참/거짓을 판별하는 조건입니다.
- TRUEVAL: 참일 때 반복문을 통해 추가할 값입니다.
- FALSEVAL: 거짓일 때 반복문을 통해 추가할 값입니다.

[예시](https://github.com/brikis98/terraform-up-and-running-code/blob/master/code/terraform/05-tips-and-tricks/loops-and-if-statements/live/global/string-directives/main.tf)를 보면서 함께 살펴봅시다.

```terraform
variable "names" {
  description = "A list of names"
  type        = list(string)
  default     = ["alice", "bob", "charlie"]
}

# if 구문을 사용하는 방법입니다.
output "for_directive_index_if" {
  value = <<EOF
%{ for i, name in var.names }
  ${name}%{ if i < length(var.names) - 1 }, %{ endif }
%{ endfor }
EOF
}

# 마지막 `,` 문자에 대해 strip을 할 수도 있습니다.
output "for_directive_index_if_strip" {
  value = <<EOF
%{~ for i, name in var.names ~}
${name}%{ if i < length(var.names) - 1 }, %{ endif }
%{~ endfor ~}
EOF
}

# 마지막 `,` 문자에 대해 strip을 할 수도 있습니다.
output "for_directive_index_if_else_strip" {
  value = <<EOF
%{~ for i, name in var.names ~}
${name}%{ if i < length(var.names) - 1 }, %{ else }.%{ endif }
%{~ endfor ~}
EOF
}
```

`terraform init && terraform apply`를 수행하면 아래와 같은 결과값을 보실 수 있습니다.

```bash
$ terraform init && terraform apply

(생략)

Apply complete! Resources: 0 added, 0 changed, 0 destroyed.

Outputs:

for_directive_index_if = <<EOT

  alice,

  bob,

  charlie


EOT
for_directive_index_if_else_strip = "alice, bob, charlie."
for_directive_index_if_strip = "alice, bob, charlie"
```

# Lessons Learned

제 5장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. (중요!) Prerequisite를 반드시 읽어주세요. 테라폼의 타입과 값에 대한 내용은 알고있어야 앞으로의 진행이 수월할 것입니다!

   1. 프로그래밍 언어처럼 다루려면, 어떤 타입과 값을 사용할 수 있는지는 기본적으로 알아야 하기 때문입니다.

2. 조건문의 사용방법과 주의사항에 대해 배웠습니다.

이것으로 제 5장, 조건문 설명을 마칩니다. 긴 글 읽어주셔서 감사합니다.
