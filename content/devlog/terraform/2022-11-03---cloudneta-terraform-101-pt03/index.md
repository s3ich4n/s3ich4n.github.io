---
title: "[CloudNet@] 테라폼 스터디 3주차 - Terraform 상태 격리방안"
date: "2022-11-03T21:09:10.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-11-03-cloudneta-terraform-101-pt03"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform 의 상태값에 대한 격리 방안에 대한 내용을 담고있습니다. 아울러 속성값 참고와 내장 함수에 대한 설명을 함께 추가하였습니다."
socialImage: "./media/terraform03.jpg"
---

이 내용은 CloudNet@ 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 Terraform Up & Running 2nd Edition 입니다.

---

# Prerequisites

- [AWS S3](https://docs.aws.amazon.com/ko_kr/AmazonS3/latest/userguide/Welcome.html)
  - 오브젝트를 버킷 단위로 저장하는 클라우드 스토리지
- AWS DynamoDB
  - AWS에서 제공하는 NoSQL 데이터베이스 서버
- (스포!) 원격지에 테라폼의 "상태"를 기록하기 위해 사용합니다!

아래에서 3주차 스터디 내용을 공유합니다.

교재의 3장을 다룹니다.

# 들어가며...

테라폼의 상태 관리에 대해 정리하고자 합니다. 왜 상태관리를 해야하는지, 어떤방안이 있으며 어떤식으로 작성하면 좋은지 작성합니다.

## 테라폼 상태관리의 필요성

테라폼은 기본적으로 생성한 인프라에 대한 정보를 상태파일에 기록합니다.

- `terraform.tfstate` 파일로 기록됩니다.
- 상태 파일은 프라이빗 API 임에 유의합니다!
  - 배포할 때 마다 테라폼이 알아서 작성하는 파일입니다. **임의로 건들여서는 안됩니다**!

본격적으로 테라폼을 도입하고, 코드를 작성/배포하다 보면 자연스럽게 여러 사람들이 작업하겠지요. 그렇다면 자연스레 아래와 같은 요구사항이 발생할 수 있습니다.

- 상태파일 저장을 위한 _"공유 스토리지"_ 사용 필요
- 상태파일 잠금(Locking)이 필요
  - 한번에 한 명령만 실행; 경쟁 상태(_race condition_) 방지 필요
- 상태파일을 격리가 필요
  - 개발환경, 테스트환경, 스테이징 환경, 프로덕션 환경 등이 잘 분리되어있어야 함

## 테라폼 상태 공유 방법

운영, 프로덕션 레벨에서 팀 단위로 인프라 구성 코드를 공유하는 방법은 여러가지가 있습니다.

### Git 등의 VCS를 이용하면?

- push/pull 시 실수로 파일을 빼먹거나 해서 문제가 발생할 수 있습니다.
  - 버그를 잡은 코드가 다시 들어가거나
  - 그로인해 인프라가 복제되거나, 사라지거나.... :scream:
- 락을 걸 수 없음(`terraform apply` 에 대한 락을 의미)
  - 한번 한 명령만 실행할 수 없습니다.
- 시크릿 파일 관리가 곤란함
  - 테라폼의 모든 데이터는 평문으로 쓰임
  - 주요 기밀정보가 **평문으로 기록**됩니다! :scream:

이런 문제를 해결하기 위해선, 원격 백엔드를 사용합니다. 1장에서 배운 "backend"의 저장공간을 원격 저장소로 설정하는 것을 의미합니다.

### 테라폼의 원격 백엔드 를 사용하면?

- `.tfstate` 파일을 원격지에 두고 관리할 수 있습니다.
  - AWS S3
    - GCP 클라우드 스토리지
    - Azure storage
    - HashiCorp 사의
      - Terraform Cloud (비싸고 좋고 추천받음)
      - Terraform Pro
      - Terraform Enterprise
    - etc.
- 본 교재에서는 AWS S3와 DynamoDB의 결합을 이용하여 소개합니다.

# 테라폼 상태 관리

그렇다면, 원격 백엔드를 활용한 상태관리를 살펴봅시다.

제 3장의 예시를 보면 dev, staging 환경을 S3, DynamoDB로 분리하긴 했지만, 상태파일 자체가 단일인 상황은 막을 수 없습니다. 따라서, 책에서는 상태 격리에 대해서는 두가지 접근법을 함께 사용하기를 제안합니다.

1. 테라폼의 `Workspace` (이하 워크스페이스) 라는 개념

   - 복수개의/분리된/이름이 지정된 워크스페이스를 사용하여 상태파일을 격리합니다.

2. 분리된 파일 레이아웃 지정
   - 개발환경, 스테이징 환경, 실제 프로덕션 환경(!)에 대한 분리를 통해 실수를 방지할 수 있습니다.
   - 디렉토리 구조를 통한 분리를 의미합니다.
     - [예습!] 이는 모듈화 및 테라폼 내의 `function` 기능과도 밀접한 영향을 가집니다. 필요한 사항에 대해서는 프로그램을 작성하거나 모듈화를 잘 하여 반복되는 코드를 없애자는 것이 주요 골자죠.

## 상태관리 (1): Workspace 설정

그렇다면, 상태관리를 가능하게 하는 방법 중 하나인 `Workspace`를 알아봅시다.

테라폼은 기본적으로 `default` 라는 워크스페이스를 사용합니다. 새 작업공간을 만들기 위해서는 `terraform workspace` 커맨드를 사용합니다.

그렇다면 워크스페이스를 변경하는 것은 어떤 의미를 가질까요?

- **다른 작업 공간으로 전환**하는 것은 **상태 파일이 저장된 경로를 변경**하는 것과 같습니다.
- 작업 공간은 코드 리팩토링을 시도하는 것 같이 이미 **배포되어 있는 인프라에 영향을 주지 않고 테라폼 모듈을 테스트** 할 때 유용합니다.
- 다시말해, 새로운 작업 공간을 생성하여 완전히 **동일한 인프라의 복사본을 배포**할 수 있지만 상태 정보는 별도의 파일에 저장합니다.

상술하였듯, 워크스페이스 지정**만**으로는 문제를 해결할 수 없습니다. 후술할 파일 레이아웃을 함께 지정하여 작업하는 것이 권장됩니다. 어떤 이유로 인해 워크스페이스 만을 사용할 수 없는지 아래에서 설명하겠습니다:

1. 먼저, 모든 작업 공간의 상태 파일은 동일한 백엔드(예. 동일한 S3 버킷)에 저장합니다. 모든 작업 공간이 동일한 인증과 접근 통제를 사용합니다.
   - E.g., 테스트 환경과 프로덕션 환경이 다른 백엔드를 사용하는 경우, 백엔드에 다른 보안 수준의 통제 설정을 수행하는 것은 불가능합니다.
2. 코드나 터미널에 현재 작업 공간에 대한 정보가 표시 되지 않습니다. 코드 탐색 시 한 작업 공간에 배치된 모듈은 다른 모든 작업 공간에 배치된 모듈과 동일합니다.
   - 이로 인해 인프라를 제대로 파악하기 어려워 유지 관리가 어렵게 됩니다.
3. 위 두 항목의 결합된 문제가 발생 할 수 있음. 예를 들면 테스트 환경이 아닌 프로덕션 환경에서 `terraform destroy` **명령을 실행** 할 수 있습니다..... :scream_cat:
   - 검증과 운영 환경이 동일한 인증 매커니즘을 사용하기 때문에 위 오류에서 보호할 방법이 없습니다.
4. 따라서 **파일 레이아웃**을 이용한 격리를 함께 사용할 것을 권장합니다.

## 상태관리 (2): 파일 레이아웃을 이용한 구성파일 격리

상태관리 방법 중 또다른 하나는 파일 레이아웃을 잡는 것입니다. 핵심은 아래와 같습니다.

- 테라폼 프로젝트를 생성하고, 파일레이아웃을 잡습니다.
  - 각 구성파일을 분리된 폴더에 넣습니다(E.g., staging, production, etc.).
  - 필요에 따라 디렉토리 별로에 서로 다른 백엔드 환경을 구성합니다(E.g., S3 버킷 백엔드의 AWS 계정분리).

예시를 위해, 아래와 같은 구조를 가진다고 하죠.

```
.
├── global
│   └── s3
│       ├── main.tf
│       └── outputs.tf
├── mgmt
│   ├── services
│   └── vpc
├── prod
│   ├── services
│   └── vpc
└── stage
    ├── data-stores
    │   └── mysql
    │       ├── main-vpgsg.tf
    │       ├── main.tf
    │       ├── outputs.tf
    │       ├── terraform.tfstate
    │       └── variables.tf
    └── services
        └── webserver-cluster
            ├── main.tf
            └── user-data.sh
```

- 최상위 폴더

  - **stage** : 테스트 환경과 같은 사전 프로덕션 워크로드 workload 환경
  - **prod** : 사용자용 맵 같은 프로덕션 워크로드 환경
  - **mgmt** : 베스천 호스트(Bastion Host), 젠킨스(Jenkins) 와 같은 데브옵스 도구 환경
  - **global** : S3, IAM과 같이 모든 환경에서 사용되는 리소스를 배치

- 각 환경별 구성 요소

  - **vpc** : 해당 환경을 위한 네트워크 토폴로지
  - **services** : 해당 환경에서 서비스되는 애플리케이션, 각 앱은 자체 폴더에 위치하여 다른 앱과 분리
  - **data-storage** : 해당 환경 별 데이터 저장소. 각 데이터 저장소 역시 자체 폴더에 위치하여 다른 데이터 저장소와 분리

- 명명 규칙 naming conventions (예시)

  - **variables.tf** : 입력 변수
  - **outputs.tf** : 출력 변수
  - **main-xxx.tf** : 리소스 → 개별 테라폼 파일 규모가 커지면 특정 기능을 기준으로 **별도 파일**로 분리
    - E.g., main-iam.tf, main-s3.tf 등
    - 후에 배울 **모듈** 단위로 나눌 수 있습니다.
  - **dependencies.tf** : 데이터 소스
  - **providers.tf** : 공급자

# 상태관리 예제 (1)

이 문단에서는 ELB, ASG, 그리고 RDS가 구축된 환경을 만들고, 이에 대해 디렉토리 구조를 아래와 같이 작성하여 실습하도록 하겠습니다.

```
├── global
│   └── s3
│       ├── main.tf
│       └── outputs.tf
└── stage
    ├── data-stores
    │   └── mysql
    │       ├── main-vpgsg.tf
    │       ├── main.tf
    │       ├── outputs.tf
    │       └── variables.tf
    └── services
        └── webserver-cluster
            ├── main.tf
            └── user-data.sh
```

코드의 위치는 아래와 같습니다:

- https://github.com/s3ich4n/terraform-study-101/tree/main/chapter03/example03-file-layout

## RDS 생성 도중 배울 요소

- 리소스에 전달해야 되는 매개변수 중 **패스워드** 처럼 **민감정보**는 코드에 직접 **평문 입력을 하는 대신 전달 할 수 있는 방안**을 모색해야 합니다. 방법은 아래와 같습니다.
  - 다양한 **시크릿 저장소를 활용**
    E.g.,
    AWS Secret Manager, AWS SSM Parameter
    GCP KMS 와 KMS Secrets
    Azure Key Vault 와 Vault Secret, etc.
    - 최소한의 일만 하는 계정을 만들기: 분리와 역할, 필요하면 추가
      - 스테이징: 스테이징 프로비저닝에 필요한 AWS 서비스 일부만 허용
      - 프로덕션: 상기 내용과 마찬가지(권한은 모두 막고, 필요한 단편적인 기능만을 허용하여 넓혀가는 것이 좋습니다.)
  - 테라폼 **외부에서 환경 변수**를 통해 시크릿 값을 테라폼에 전달
    (테스트나 빠르게 개발할 때만 쓰고, 현업에선 **절대** 사용하지 맙시다!)
    - `export TF_VAR_db_password="(YOUR_DB_PASSWORD)"`
    - 혹은 `direnv` 의 `.envrc` 파일에 상기 명령과 같은 환경변수를 넣어놓고 사용합니다.

## 웹 서버 클러스터 배포 중 배울 요소

웹 서버 클러스터를 배포하며 `terraform_remote_state` 라는 값과, 테라폼의 내장 함수(build-in function)에 대해 살펴봅시다.

- 백엔드에 상태 파일(위에서 살펴본 RDS 정보)를 읽어서 웹 서버 클러스터 구성을 합니다. 이 때 변환 데이터는 읽기 전용입니다.
- 모든 데이터베이스의 출력 변수는 상태 파일에 저장되며 아래와 같은 형식의 속성 참조를 이용해 `terraform_remote_state` 데이터 소스에서 읽을 수 있으며, 그 양식은 아래와 같습니다.

> ```
> data.terraform_remote_state.<NAME>.outputs.<ATTRIBUTE>
> ```

- E.g., `terraform_remote_state` 데이터 소스에서 데이터베이스 주소와 포트 정보를 가져와서 HTTP 응답에 정보를 노출

```bash
user_data = <<EOF
#!/bin/bash
echo "Hello, World" >> index.html
echo "${data.terraform_remote_state.db.outputs.address}" >> index.html
echo "${data.terraform_remote_state.db.outputs.port}" >> index.html
nohup busybox httpd -f -p ${var.server_port} &
EOF
```

- **사용자 데이터 스크립트**가 길어지면 인라인으로 정의가 복잡해집니다. 이럴 때는 관련 코드를 외부화하는 것이 코드의 복잡도를 떨어뜨리는 방법입니다. 테라폼의 **내장 함수**와 `template_file` 라는 데이터 소스를 사용해봅시다.
- 테라폼에는 표현식을 사용하여 실행할 수 있는 여러 **내장 함수**(built-in functions)들이 있습니다. 함수 사용법은 아래와 같습니다.
  - [내장 함수에 대한 링크](https://developer.hashicorp.com/terraform/language/functions)를 참고하셔서, 필요한 내장 함수가 있는지 확인해보시고 적재적소에 사용합시다.
  - [바퀴를 두번 만들 필요는 없지요!](https://en.wikipedia.org/wiki/Reinventing_the_wheel)

> ```
> function_name()
> ```

- E.g., [`format`](https://developer.hashicorp.com/terraform/language/functions/format) 함수는 아래 처럼 사용합니다. 문자열 FMT의 `sprintf` 구문에 따라 `ARGS` 인수를 형식화하는 호출방식입니다.

> ```
> format(<FMT>, <ARGS>, ...)
> ```

- 내장 함수는 테라폼 콘솔을 실행 후, 대화형 콘솔을 사용해서 질의한 결과를 바로 확인하는 것으로 디버깅할 수 있습니다.
- 테라폼 콘솔은 **읽기 전용**입니다. 실수로 인프라나 상태가 변경되지 않습니다. 안심하세요!

```bash
# 참고: 테라폼 콘솔 사용에 관하여
terraform console
> format("%.3f", 3.14159265359)
"3.142"
```

- 그 외에도 테라폼에는 문자열, 숫자, 리스트, 맵 등을 조작하는 데 사용할 수 있는 많은 내장 함수가 존재합니다. 예시에서는 [`templatefile`](https://developer.hashicorp.com/terraform/language/functions/templatefile) 함수를 살펴봅시다.
- `templatefile` 함수는 PATH 에서 파일을 읽고 그 내용을 문자열로 반환합니다.

> ```
> templatefile(<PATH>, <VARS>)
> ```

- E.g., 스크립트 파일을 넣고 stage/services/webserver-cluster/user-data.sh 파일을 넣고 문자열로 내용을 읽을 수 있습니다.

```bash
#!/bin/bash

cat > index.html <<EOF
<h1>Hello, World</h1>
<p>DB address: ${db_address}</p>
<p>DB port: ${db_port}</p>
EOF

nohup busybox httpd -f -p ${server_port} &
```

- 사용자 데이터 스크립트에 동적인 데이터는 참조와 보간을 활용. 아래는 ASG 코드 예시
- `templatefile` 데이터 소스의 vars 맵에 있는 변수만 사용 가능

```bash
resource "aws_launch_configuration" "example" {
  image_id        = "ami-0fb653ca2d3203ac1"
  instance_type   = "t2.micro"
  security_groups = [aws_security_group.instance.id]

  # Render the User Data script as a template
  user_data = templatefile("user-data.sh", {
    server_port = var.server_port
    db_address  = data.terraform_remote_state.db.outputs.address
    db_port     = data.terraform_remote_state.db.outputs.port
  })

  # Required when using a launch configuration with an auto scaling group.
  lifecycle {
    create_before_destroy = true
  }
}
```

# Lessons Learned

제 3장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. 테라폼 파일을 다수의 사람과 함께 관리할 때 상태관리는 선택이 아닌 필수입니다.
   1. 워크스페이스 설정을 수행합니다.
   2. 파일 레이아웃을 함께 잡아, 실수를 최대한으로 줄입시다.
2. 민감정보는 시크릿 저장소와 같은 서비스를 활용합시다.
3. 속성 참조와 내장함수를 통해, 코드반복을 대폭축소합시다.

# Tips and tricks

- 테라폼 코드도 컨벤션이 있습니다!
  - [테라폼 컨벤션](https://developer.hashicorp.com/terraform/language/syntax/style)에 대한 이해를 하고, lint 도 할 수 있다는 말이겠군요.
  - 그렇다면 pre-commit hook 도 당연히 있을겁니다.
  - 그렇다면 테스트에도 쓰일 수 있겠군요.

이것으로 제 3장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
