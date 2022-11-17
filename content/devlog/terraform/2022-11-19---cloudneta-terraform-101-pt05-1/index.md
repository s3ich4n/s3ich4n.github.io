---
title: "[CloudNet@] 테라폼 스터디 5주차 - Terraform의 반복문과 조건문 (1) - 반복문"
date: "2022-11-16T03:37:57.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-11-19-cloudneta-terraform-101-pt05-1"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform의 타입과 값이 어떻게 쓰이는지 알고있다는 가정 하에, 반복문과 조건문을 사용하여 로직을 표현하는 방법을 담았습니다. 그 중, 반복문을 먼저 살펴봅시다."
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

- 반복, 조건문 사용방법
- 무중단 배포에 필요한 요소들 사용방법
- 주의사항

## 반복문

테라폼이 제공하는 반복문 구성은 아래와 같습니다:

- `count` 구문
- `for_each` 표현식
- `for` 표현식
- `for` 문자열 지시어

### `count` 구문

`count` 구문을 사용한 반복에 대해 살펴봅시다.

#### `count` 구문을 사용한 반복문 (1)

IAM 사용자를 3명 생성하는 예시로 살펴보겠습니다. 리소스는 [`aws_iam_user`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) 를 사용합니다. `name` 필드는 Required 입니다.

전체 예시코드는 `chapter05/example01/count/index` 디렉토리를 살펴봐주세요.

- `iam.tf` 파일 전체

```terraform
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_iam_user" "ch05-iam" {
  count = 3
  # 0부터 시작, 3번 반복합니다.
  name  = "s3ich4n.${count.index}"
}
```

- 이 경우, 0부터 시작, 2까지 반복하는 인덱스 값을 추가합니다.
- `name` 값에 인덱스를 사용하지 않는다면, 3명의 IAM 사용자 이름 **중복**으로 오류가 발생합니다. 따라서, 반복문의 인덱스값을 사용하여 각 사용자에게 고유한 이름을 사용하도록 코드를 작성하였습니다.

예시를 구동해봅시다.

```bash
`$ terraform init

Initializing the backend...

Initializing provider plugins...
- Finding latest version of hashicorp/aws...
- Installed hashicorp/aws v4.39.0 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!
(중략)

$ terraform apply

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_iam_user.ch05-iam[0] will be created
  + resource "aws_iam_user" "ch05-iam" {
      (생략)
      + name          = "s3ich4n.0"
    }

  # aws_iam_user.ch05-iam[1] will be created
  + resource "aws_iam_user" "ch05-iam" {
      (생략)
      + name          = "s3ich4n.1"
    }

  # aws_iam_user.ch05-iam[2] will be created
  + resource "aws_iam_user" "ch05-iam" {
      (생략)
      + name          = "s3ich4n.2"
    }

Plan: 3 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

aws_iam_user.ch05-iam[1]: Creating...
aws_iam_user.ch05-iam[2]: Creating...
aws_iam_user.ch05-iam[0]: Creating...
aws_iam_user.ch05-iam[1]: Creation complete after 1s [id=s3ich4n.1]
aws_iam_user.ch05-iam[2]: Creation complete after 1s [id=s3ich4n.2]
aws_iam_user.ch05-iam[0]: Creation complete after 1s [id=s3ich4n.0]

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

#
# 반복문 구동을 확인했습니다. 삭제합시다.
#
$ terraform destroy -auto-approve

aws_iam_user.ch05-iam[2]: Refreshing state... [id=s3ich4n.2]
aws_iam_user.ch05-iam[0]: Refreshing state... [id=s3ich4n.0]
aws_iam_user.ch05-iam[1]: Refreshing state... [id=s3ich4n.1]

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  - destroy

Terraform will perform the following actions:

  # aws_iam_user.ch05-iam[0] will be destroyed
  - resource "aws_iam_user" "ch05-iam" {
    (생략)
    }

  # aws_iam_user.ch05-iam[1] will be destroyed
  - resource "aws_iam_user" "ch05-iam" {
    (생략)
    }

  # aws_iam_user.ch05-iam[2] will be destroyed
  - resource "aws_iam_user" "ch05-iam" {
    (생략)
    }

Plan: 0 to add, 0 to change, 3 to destroy.
aws_iam_user.ch05-iam[2]: Destroying... [id=s3ich4n.2]
aws_iam_user.ch05-iam[0]: Destroying... [id=s3ich4n.0]
aws_iam_user.ch05-iam[1]: Destroying... [id=s3ich4n.1]
aws_iam_user.ch05-iam[1]: Destruction complete after 1s
aws_iam_user.ch05-iam[2]: Destruction complete after 1s
aws_iam_user.ch05-iam[0]: Destruction complete after 1s

Destroy complete! Resources: 3 destroyed.

```

0부터 2까지 반복되어 유저 이름에 값이 붙은 것을 확인할 수 있습니다.

#### `count` 구문을 사용한 반복문 (2)

- (스포) 위험한 코드입니다! 잘못쓰기 쉬우니, 아래 주의사항을 반드시 보세요!

마찬가지로, IAM 사용자를 3명 생성하는 예시로 살펴보겠습니다. 리소스는 [`aws_iam_user`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) 를 사용합니다. `name` 필드는 Required 입니다.

전체 예시코드는 `chapter05/example01/count/list_and_default` 디렉토리를 살펴봐주세요.

- `variables.tf` 파일

```terraform
variable "user_names" {
  description = "Create IAM users with these names"
  # 문자열을 담는 "리스트" 타입입니다.
  type        = list(string)
  default     = ["alice", "bob", "charlie"]
}
```

- `iam.tf` 파일

```terraform
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_iam_user" "ch05-ex01-count" {
  # 이런 식으로, user_names내 리스트 값의 길이를 알 수 있지요.
  count = length(var.user_names)
  name  = var.user_names[count.index]
}
```

- `outputs.tf` 파일

```terraform
output "first_arn" {
  # 첫번째 값을 가져옵니다.
  value       = aws_iam_user.ch05-ex01-count[0].arn
  description = "The ARN for the first user"
}

output "all_arns" {
  # 전체 값을 가져오는건 이렇게 사용합니다.
  value       = aws_iam_user.ch05-ex01-count[*].arn
  description = "The ARNs for all users"
}
```

어떤 코드인지 개념을 살펴봅시다.

- 테라폼에서는 `count` 와 함께 배열 조회 구문과 [`length` 함수](https://developer.hashicorp.com/terraform/language/functions/length) 를 사용해서 반복을 할 수 있습니다.
  - 배열 조회 구문
    - ARRAY[<INDEX>]
    - E.g., var.user_names 의 인덱스 `0`에서 요소를 찾는 방법: `ch05-ex01-count[0]`
    - 전체 값을 가져오는 방법: `ch05-ex01-count[*]`
  - length (내장) 함수
    - length(<ARRAY>)
    - 주어진 ARRAY 의 항목 수를 반환하는 함수. 문자열 및 맵을 대상으로도 동작합니다.

이 예제를 스스로 `terraform init && terraform apply -auto-approve` 해보시기 바랍니다.
(`-auto-approve` 플래그는, 자동으로 프로비저닝하라는 키워드입니다.)

```bash
$ terraform init && terraform apply -auto-approve

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_iam_user.ch05-ex01-count[0] will be created
  + resource "aws_iam_user" "ch05-ex01-count" {
      (생략)
      + name          = "alice"
      (생략)
    }

  # aws_iam_user.ch05-ex01-count[1] will be created
  + resource "aws_iam_user" "ch05-ex01-count" {
      (생략)
      + name          = "bob"
      (생략)
    }

  # aws_iam_user.ch05-ex01-count[2] will be created
  + resource "aws_iam_user" "ch05-ex01-count" {
      (생략)
      + name          = "charlie"
      (생략)
    }

Plan: 3 to add, 0 to change, 0 to destroy.

(생략)

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

all_arns = [
  "arn:aws:iam::240962124292:user/alice",
  "arn:aws:iam::240962124292:user/bob",
  "arn:aws:iam::240962124292:user/charlie",
]
first_arn = "arn:aws:iam::240962124292:user/alice"
```

#### `count` 를 사용한 반복문의 제약사항

위의 예제를 통해 계정을 만들고, 아래의 예시를 통해 제약사항을 살펴봅시다.

1. 전체 리소스를 반복할 수는 있지만 리소스 내에서 인라인 블록을 반복할 수는 없습니다. 아래 예시로 살펴봅시다.

   ```terraform
   resource "aws_autoscaling_group" "example" {
     launch_configuration = aws_launch_configuration.example.name
     vpc_zone_identifier  = data.aws_subnets.default.ids
     target_group_arns    = [aws_lb_target_group.asg.arn]
     health_check_type    = "ELB"

     min_size = var.min_size
     max_size = var.max_size

     tag {
       key                 = "Name"
       value               = var.cluster_name
       propagate_at_launch = true
     }
   }
   ```

   1. 각각의 tag 를 사용하려면 `key`, `value`, `propagate_at_launch` 에 대한 값으로 새 인라인 블록을 만들어야 합니다.
   2. 따라서 `count` 구문을 사용해서 이러한 태그를 반복하여 동적인 인라인 `tag` 블록을 생성하려고 시도할 수도 있지만, 인라인 블록 내에서는 count 사용은 지원하지 않습니다.

2. 코드 재사용시 **치명적인** 문제가 있습니다. 아래 예시로 살펴봅시다.
   - `variables.tf`

```terraform
variable "user_names" {
  description = "Create IAM users with these names"
  type        = list(string)
  default     = ["alice", "charlie"]
}
```

1. 배열의 중간에 항목을 제거하면 모든 항목이 1칸씩 앞으로 당겨질 것입니다.

2. 테라폼은 인덱스 번호를 리소스 식별자로 봅니다. 따라서, ‘인덱스 1에서는 계정을 만들고, 인덱스2에서는 버킷을 삭제한다’라고 해석합니다.

   ```bash
   $ terraform plan

   aws_iam_user.ch05-ex01-count[2]: Refreshing state... [id=charlie]
   aws_iam_user.ch05-ex01-count[1]: Refreshing state... [id=bob]
   aws_iam_user.ch05-ex01-count[0]: Refreshing state... [id=alice]

   Note: Objects have changed outside of Terraform

   Terraform detected the following changes made outside of Terraform since the last "terraform apply" which may have affected this plan:

     # aws_iam_user.ch05-ex01-count[0] has changed
     ~ resource "aws_iam_user" "ch05-ex01-count" {
           id            = "alice"
           name          = "alice"
         + tags          = {}
           # (5 unchanged attributes hidden)
       }

     # aws_iam_user.ch05-ex01-count[1] has changed
     ~ resource "aws_iam_user" "ch05-ex01-count" {
           id            = "bob"
           name          = "bob"
         + tags          = {}
           # (5 unchanged attributes hidden)
       }

     # aws_iam_user.ch05-ex01-count[2] has changed
     ~ resource "aws_iam_user" "ch05-ex01-count" {
           id            = "charlie"
           name          = "charlie"
         + tags          = {}
           # (5 unchanged attributes hidden)
       }


   (plan 경고문은 생략. 현재 테라폼 코드로는 이런 식으로 프로비저닝 될 것이다 하는 내용이 써져있습니다.)

   Terraform will perform the following actions:

     # aws_iam_user.ch05-ex01-count[1] will be updated in-place
     ~ resource "aws_iam_user" "ch05-ex01-count" {
           id            = "bob"
         ~ name          = "bob" -> "charlie"
           tags          = {}
           # (5 unchanged attributes hidden)
       }

     # aws_iam_user.ch05-ex01-count[2] will be destroyed
     # (because index [2] is out of range for count)
     - resource "aws_iam_user" "ch05-ex01-count" {
         - arn           = "arn:aws:iam::240962124292:user/charlie" -> null
         - force_destroy = false -> null
         - id            = "charlie" -> null
         - name          = "charlie" -> null
         - path          = "/" -> null
         - tags          = {} -> null
         - tags_all      = {} -> null
         - unique_id     = "AIDATQGTWHICFTYJYIOOQ" -> null
       }

   Plan: 0 to add, 1 to change, 1 to destroy.

   Changes to Outputs:
     ~ all_arns = [
           # (1 unchanged element hidden)
           "arn:aws:iam::240962124292:user/bob",
         - "arn:aws:iam::240962124292:user/charlie",
       ]
   ```

3. `count` 사용 시 목록 중간 항목을 제거하면 테라폼은 해당 항목 뒤에 있는 **모든 리소스를 삭제**한 다음 해당 리소스를 처음부터 다시 만듭니다.........

### `for_each` 표현식

`for_each` 표현식을 이용한 반복문을 사용해봅시다. 먼저 `for_each` 표현식에 대해 알아봅시다.

- `for_each` 구문은 테라폼 문법에 정의된 `meta-argument ` 입니다. 모듈, 모든 리소스 타입에 응용될 수 있습니다.

- `list`, `set`, `map`을 사용하여 전체 리소스의 복사본, 리소스 내 인라인 블록의 복사본, 모듈의 복사본을 만들 수 있습니다. 문법은 아래와 같습니다:

  ```terraform
  resource "<PROVIDER>_<TYPE>" "<NAME>" {
    for_each = <COLLECTION>

    [CONFIG ...]
  }
  ```

  - COLLECTION: 루프를 처리할 set, map 을 의미
  - CONFIG: 리소스와 관련된 하나이상의 인수
    - `each.key`, `each.value` 로 키/밸류에 접근할 수 있습니다.

#### `for_each` 표현식을 이용한 예시 (1)

전체 예시코드는 `chapter05/example01/for_each` 디렉토리를 살펴봐주세요.

- `iam.tf`

  ```terraform
  provider "aws" {
    region = "ap-northeast-2"
  }

  resource "aws_iam_user" "ch05-foreach" {
    for_each = toset(var.user_names)
    name     = each.value
  }
  ```

- `variables.tf`

  ```terraform
  variable "user_names" {
    description = "Create IAM users with these names"
    type        = list(string)
    default     = ["alice", "bob", "charlie"]
  }
  ```

- `outputs.tf`

  ```terraform
  output "all_users" {
    value = aws_iam_user.ch05-foreach
  }
  ```

`terraform init && terraform apply -auto-approve` 를 통해, output에 나오는 `for_each` 는 어떤식인지 살펴봅시다.

```bash
$ terraform init

(생략)

$ terraform apply -auto-approve

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_iam_user.ch05-foreach["alice"] will be created
  + resource "aws_iam_user" "ch05-foreach" {
      (생략)
      + name          = "alice"
      (생략)
    }

  # aws_iam_user.ch05-foreach["bob"] will be created
  + resource "aws_iam_user" "ch05-foreach" {
      (생략)
      + name          = "bob"
      (생략)
    }

  # aws_iam_user.ch05-foreach["charlie"] will be created
  + resource "aws_iam_user" "ch05-foreach" {
      (생략)
      + name          = "charlie"
      (생략)
    }

Plan: 3 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + all_users = {
      + alice   = {
      (생략)
          + name                 = "alice"
      (생략)
        }
      + bob     = {
      (생략)
          + name                 = "bob"
      (생략)
        }
      + charlie = {
      (생략)
          + name                 = "charlie"
      (생략)
        }
    }
(생략)

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

all_users = {
  "alice" = {
    "arn" = "arn:aws:iam::REDACTED:user/alice"
    "force_destroy" = false
    "id" = "alice"
    "name" = "alice"
    "path" = "/"
    "permissions_boundary" = tostring(null)
    "tags" = tomap(null) /* of string */
    "tags_all" = tomap({})
    "unique_id" = "REDACTED"
  }
  "bob" = {
    "arn" = "arn:aws:iam::REDACTED:user/bob"
    "force_destroy" = false
    "id" = "bob"
    "name" = "bob"
    "path" = "/"
    "permissions_boundary" = tostring(null)
    "tags" = tomap(null) /* of string */
    "tags_all" = tomap({})
    "unique_id" = "REDACTED"
  }
  "charlie" = {
    "arn" = "arn:aws:iam::REDACTED:user/charlie"
    "force_destroy" = false
    "id" = "charlie"
    "name" = "charlie"
    "path" = "/"
    "permissions_boundary" = tostring(null)
    "tags" = tomap(null) /* of string */
    "tags_all" = tomap({})
    "unique_id" = "REDACTED"
  }
}

```

`all_users` 출력 변수가 `for_each` 의 키, 즉 사용자 이름을 키로 가지며 값이 해당 리소스의 전체 출력인 맵을 포함합니다.

#### for_each 표현식을 이용한 예시 (2): 인라인 블록

- [해당 링크](https://developer.hashicorp.com/terraform/tutorials/configuration-language/for-each)의 예시를 참조하였습니다.

### `for` 표현식

복잡한 타입을 또다른 복잡한 타입으로 변환하는데 쓰입니다. `for` 표현식은 아래와 같이 사용합니다. ([공식링크](https://developer.hashicorp.com/terraform/language/expressions/for))

#### `for` 표현식을 이용한 예시 (1): 컨테이너에 값을 추가하기

list 내의 모든 이름을 대문자로 변환하는 예제를 통해 알아봅시다. 사용은 아래와 같이 할 수 있습니다.

```terraform
# 결과를 list 형식으로 리턴합니다.
[for <ITEM> in <LIST> : <OUTPUT>]
[for <ITEM> in <LIST> : <OUTPUT> if <EXPRESSION>]

# 결과를 map 형식으로 리턴합니다.
{for <ITEM> in <LIST> : <OUTPUT_KEY> => <OUTPUT_VALUE>}
{for <ITEM> in <LIST> : <OUTPUT_KEY> => <OUTPUT_VALUE> if <EXPRESSION>}
```

- LIST: 반복할 리스트
- ITEM: LIST의 각 항목에 할당할 변수의 이름
- OUTPUT: ITEM을 변환한 표현식
- `if` 구문(optional): 조건(`<EXPRESSION>`)에 맞으면 값을 추가

```terraform
variable "names" {
  description = "A list of names"
  type        = list(string)
  default     = ["alice", "bob", "charlie"]
}

output "upper_names" {
  # names 안의 값에 대해 반복을 진행하며, 결과로는 upper(이름)의 값이 들어갑니다.
  value = [for name in var.names : upper(name)]
}

output "short_upper_names" {
  # 조건을 기재할 수도 있습니다.
  value = [for name in var.names : upper(name) if length(name) < 6]
}

variable "prize_level" {
  description = "map"
  type        = map(string)
  default     = {
    alice     = "#1"
    bob       = "#2"
    charlie   = "#3"
  }
}

output "prize_status" {
  # prize_status의 value는 키, 밸류 쌍을 꺼낸 문자열을 리턴할 수 있습니다.
  value = [for name, role in var.prize_level : "\${name} goes to \${role} prize"]
}

output "upper_prize_status" {
  # name, role에 해당하는 map을 리턴할 수도 있습니다.
  value = {for name, role in var.prize_level : upper(name) => upper(role)}
}
```

#### `for` 표현식을 이용한 예시 (2): 문자열로 리턴하기

앞서서 문자열 내에서 테라폼 코드를 참조하는 보간법 예시는 사용해본 적이 있습니다. `"Hello, ${var.name}!"` 과 같은 방식으로요.

문자열 지시자를 사용하면, 문자열 보간처럼 `for` 반복문, `if` 제어문에서도 사용할 수 있습니다. 어떻게 사용하는지 살펴봅시다.

```terraform
# 반복문의 기본입니다.
%{ for <ITEM> in <COLLECTION> }<BODY>%{ endfor }

# 인덱스를 추가할 수도 있습니다.
%{ for <INDEX>, <ITEM> in <COLLECTION> }<BODY>%{ endfor }

# if, if-else 구문의 사용방법입니다.
%{ for <INDEX>, <ITEM> in <COLLECTION> }<BODY>%{if <EXPRESSION>}%{ else }%{ endif }%{ endfor }
```

- COLLECTION: 반복할 리스트, 맵. 말 그대로 반복 가능한 컬렉션을 의미합니다.
- ITEM: 각 항목에 할당할 로컬 변수의 이름입니다.
- BODY: ITEM을 참조할 수 있는 각각의 반복을 렌더링하는 대상입니다.

[예시](https://github.com/brikis98/terraform-up-and-running-code/blob/master/code/terraform/05-tips-and-tricks/loops-and-if-statements/live/global/string-directives/main.tf)를 보면서 함께 살펴봅시다.

```terraform
variable "names" {
  description = "A list of names"
  type        = list(string)
  default     = ["alice", "bob", "charlie"]
}

output "for_directive" {
  # 끝의 endfor directive가 붙는다는 점을 제외하면 쉽게 이해할 수 있을 듯 합니다.
  value = "%{ for name in var.names }${name}, %{ endfor }"
}

output "for_directive_index" {
  # 파이썬의 enumerate() 을 쓰듯 사용할 수도 있군요!
  value = "%{ for i, name in var.names }(${i}) ${name}, %{ endfor }"
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

for_directive = "alice, bob, charlie, "
for_directive_index = "(0) alice, (1) bob, (2) charlie, "
for_directive_index_if = <<EOT

  alice,

  bob,

  charlie


EOT
for_directive_index_if_else_strip = "alice, bob, charlie."
for_directive_index_if_strip = "alice, bob, charlie"
```

## 조건문

# Lessons Learned

제 5장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. (중요!) Prerequisite에서, 테라폼의 타입과 값에 대한 내용은 이미 알고있어야 하는 주요한 내용이라고 봅니다.

   1. 프로그래밍 언어처럼 다루려면, 어떤 타입과 값을 사용할 수 있는지는 기본적으로 알아야 하기 때문입니다.

2. 반복문의 사용방법과 주의사항에 대해 배웠습니다.
3. 조건문의 사용방법과 주의사항에 대해 배웠습니다.

이것으로 제 5장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
