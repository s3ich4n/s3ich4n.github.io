---
title: "[CloudNet@] 테라폼 스터디 8주차 - 프로덕션 수준의 테라폼 코드"
date: "2022-12-11T23:57:22.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-12-11-cloudneta-terraform-101-pt08"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform을 프로덕션 레벨 정도로 사용하려면 어느정도는 할 수 있어야하고, 어떤걸 살펴봐야 할까요? 이 포스팅에서는 그 부분을 공부해보았습니다."
socialImage: "./media/terraform08.jpg"
---

이 내용은 [CloudNet@](https://www.notion.so/gasidaseo/CloudNet-Blog-c9dfa44a27ff431dafdd2edacc8a1863) 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

# Prerequisites

- 아무래도 기존 내용을 모두 학습해야 하겠죠.
- [클린 코드](http://www.yes24.com/Product/Goods/11681152)를 읽고 오시면 더욱 좋습니다.

# 본문

## 프로덕션 레벨의 인프라 (By production-grade Infrastructure)

저자의 프로덕션 레벨의 인프라 정의는 아래 요소들이 모두 잘 갖추어져있고, 이중화/장애대응까지 완벽히 되어있음을 말합니다:

- 서버
- 데이터 저장소
- 로드 밸런서
- 보안 기능
- 모니터링/경고 도구
- 파이프라인 구축
- 비즈니스 운영에 필요한 기타 모든 도구

아울러, 저자는 프로덕션 수준의 인프라를 만드는 프로젝트에 소요되는 대략적인 시간을 아래 정도가 걸린다고 산정하였습니다.

| 인프라 유형                                                                           | 예                                                    | 예상 소요 시간 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| 관리형 서비스 Managed service                                                         | Amazon RDS                                            | 1~2주          |
| 스스로 관리하는 분산 시스템 (상태 비저장) Self-managed distributed system (stateless) | Node.js 앱이 실행되는 ASG 클러스터                    | 2~4            |
| 스스로 관리하는 분산 시스템 (상태 저장) Self-managed distributed system (stateful)    | Amazon Elasticsearch cluster                          | 2~4개월        |
| 전체 아키텍처 Entire architecture                                                     | 애플리케이션, 데이터 저장소, 로드 밸런서, 모니터링 등 | 6~36개월       |

저는 아직 프로덕션 경험이 없지만, 개인적으로 만들고싶은 서비스를 구축한다면 관리형 서비스 ~ self managed 분산 시스템(stateless) 까지는 헤메면서 2주는 쓸 것 같습니다. 전체 아키텍처를 모두 구성하는데 길면 3년이 걸린다고 하니, 역시나 쉬운길은 아니네요. 그런데, 왜 이렇게 오래 걸리는걸까요?

## 프로덕션 수준의 인프라 구축에 시간이 오래 걸리는 이유

DevOps 프로젝트는 다른 유형의 소프트웨어 프로젝트보다 더 시간이 소요될 수 있습니다. 아래에서 이야기되는 사항들이 그 이유입니다.

### 호프스태터의 법칙(Hofstadter's Law)

호프스태터의 법칙은 일을 마치는데 더 오랜 시간이 걸리는 현상을 의미합니다. 일정보다 늦어질 것을 미리 예상했다 하더라도 여전히 일정보다 늦어진다는 것이죠. 아래와 같은 말로 언급되는 경우가 많습니다.

> 호프스태터의 법칙: 일은 항상 예상시간 보다 더 오래 걸린다. 호프스태터의 법칙을 고려했다고 하더라도...
>
> Hofstadter's Law: It always takes longer than you expect, even when you take into account Hofstadter's Law.

### 데브옵스 산업은 초창기

저자는 이를 "아직 석기시대에 있다"(...the industry is still in its infancy) 라고 표하였습니다. 클라우드 컴퓨팅, IaC, DevOps, 컨테이너 기술의 출현과 발전속도가 매우 빠르고 성숙하는 단계에 있다고 하였기 떄문입니다.

### 데브옵스는 "야크 털깎기" 현상에 취약

야크 털깎기는 목적을 이루기 위해 본래 목적과 전혀 상관없어 보이는 일들을 계속 해오고, 종국에는 그것을 이루는 행동을 말합니다.

극단적인 예시를 하나 보시죠. [도널드 커누스](https://scholar.google.com/citations?user=t0yrrzQAAAAJ)처럼 업계 부동의 원탑인 사람이라면, 책 쓰다가 디지털 조판 시스템이 답답해서 TeX를 _자신이 직접 만든_ 프로그래밍 언어로 완성함과 동시에 폰트도 만들고, 폰트의 그래픽스를 정의하기 위한 언어도 만들고, 장치종속을 풀기위해 포맷까지 만들었다고 하지요. (책을 쓰는데 10년이 걸렸다고 합니다. 그 책은 다름아닌 [TAOCP](https://www-cs-faculty.stanford.edu/~knuth/taocp.html) 입니다.)

누구나 그럴 수는 없음을 압니다. 그리고 회사는 정해진 기한과 목표물이 있지요. 저는 이를 _삽질_ 이라고 배웠습니다. 독자 여러분들도 생각해보면 '이런 개념이 이렇게 불리는구나' 하셨을 것이란 생각이 드네요.

앞서말했듯, 업계가 아직 태동기에 있으니 더더욱 그럴 수 밖에 없으리라는 것이 저자의 의견입니다.

### 수행해야하는 체크리스트가 매우 많음

대다수 개발자가 체크 리스트에 있는 대부분의 항목을 알지 못하기 때문에, 프로젝트를 평가할 때 중요하고 시간이 많이 걸리는 세부 사항을 잊어버립니다. 체크리스트는 아래와 같습니다:

| 작업                                   | 설명                                                                                             | 사용가능 도구                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 설치<br />(Install)                    | 소프트웨어 바이너리, 필요 종속성 설치                                                            | Bash, Chef, Ansible, Puppet                                |
| 설정<br />(Configure)                  | 포트 설정, TLS 인증서, 서비스 디스커버리, 리더/팔로워 복제 등의 소프트웨어 설정                  | Bash, Chef, Ansible, Puppet                                |
| 프로비전<br />(Provision)              | 서버, 로드 밸런서, 네트워크, 방화벽, IAM 권한 설정 등의 인프라 제공                              | Terraform, CloudFormation                                  |
| 배포<br />(Deploy)                     | 인프라 상위의 서비스 배포<br />중단시간 없이 업데이트 롤아웃<br />블루-그린, 카나리 배포 등      | Terraform, CloudFormation, k8s, ECS                        |
| 고가용성<br />(High Availability)      | 프로세스, 서버, 서비스, 데이터 센터, 리전 등의 장애에 대비                                       | 멀티 데이터센터, 멀티 리전, 복제, 오토스케일링, 로드밸런싱 |
| 확장성<br />(Scailability)             | 요청량에 따른 스케일 업/아웃<br />수평적 확장(더 많은 서버), 수직적 확장(더 큰 용량)             | 오토스케일링, 복제, 샤딩, 캐싱, 분할정복                   |
| 성능<br />(Performance)                | CPU, 메모리, 디스크, 네트워크, GPU 용량 최적화<br />쿼리 튜닝, 벤치마킹, 테스트, 프로파일링      | Dynatrace, valgrind, VisualVM, ab, JMeter                  |
| 네트워킹<br />(Networking)             | 정적·동적 IP 설정, 포트, 서비스 디스커버리, 방화벽, DNS, SSH 접속, VPN 연결                      | VPC, 방화벽, 라우터, DNS Registers, OpenVPN                |
| 보안<br />(Security)                   | TLS를 통한 통신 중 데이터 암호화, 디스크 암호화, 인증, 인가, 보안 관리, 서버 하드닝              | ACM, Let's Encrypt, KMS, Cognito, Vault, CIS               |
| 성능지표<br />(Metrics)                | 가용성, 비즈니스, 애플리케이션, 서버, 이벤트, 추적, 알람에 대한 메트릭                           | CloudWatch, Datadog, New Relic, Honeycomb                  |
| 로그<br />(Logs)                       | 로그 순환, 중앙으로 데이터 수집                                                                  | CloudWatch Logs, ELK, Sumo Logic, Papertrail               |
| 백업 및 복구<br />(Backup and Restore) | DB, 캐시, 기타 데이터를 일정에 따라 백업<br />리전 별, 계정 별 복제                              | RDS, ElastiCache, 복제                                     |
| 비용 최적화<br />(Cost Optimization)   | 적절한 인스턴스 유형 선택, 스팟 혹은 예약 인스턴스 사용, 오토스케일링, 사용하지 않는 리소스 정리 | 오토스케일링, 스팟 인스턴스, 예약 인스턴스                 |
| 문서화<br />(Documentation)            | 코드, 아키텍처, 모든 내용을 문서화<br />장애 대응 내용 정리(Postmortem)                          | README, 각종 위키, Slack                                   |
| 테스트<br />(Tests)                    | 인프라 코드를 테스트 자동화<br />항상 테스트 후 배포                                             | Terratest, inspec, serverspec, kitchen-terraform           |

와 세상에 이렇게나 많습니다! 그런데...

- 서버나 로드밸런서가 다운된다면 어떻게 될까요? 데이터 센터에 문제가 생긴다면 어떻게 될까요?
- VPC를 위시로 한 네트워킹 작업 또한 정말 어렵습니다. 그뿐일까요, VPN, Service Discovery, SSH Access 등 정말 많습니다!
- 그렇지만, 프로젝트 계획 및 시간 예측에서 배제되는 경우가 많습니다.

즉, 이러한 연유로 인해 프로젝트 계획 및 시간 예측이 너무나 어렵습니다.

## 프로덕션 수준의 인프라 모듈

그렇다면 프로덕션 레벨의 테라폼 코드는 어떤 것들이 필요한지 살펴보겠습니다. 테라폼 코드는 **재사용 가능한 모듈** 단위로 작성하는 것이 좋습니다. 이에 대한 모범사례를 살펴봅시다. 다룰 주제는 아래와 같습니다.

### 소형 모듈을 써야하는 이유

3장에서 학습했던 상태 파일 격리에서 알아본 것과 같이, 모든 인프라 환경은 단일파일, 단일 모듈로 정의해서는 좋지 않은 수준이 아니라 **유해** 한 것으로 간주합니다. 아래의 이유로 인해 그렇습니다.

#### 대형모듈을 썼을 떄의 문제점

- 속도가 느림(slow): 모든 인프라가 하나의 모듈에 정의되어 있으면 명령 실행 시 오래 걸립니다. `terraform plan` 구동 시 20분 걸리기도 합니다.
- 안전하지 않음(insecure): 모든 인프라가 하나의 모듈에 정의되어 있으면, 어떤 것을 변경 시 모든 액세스 권한을 사용하게 됩니다.
  - 따라서 모든 사용자에게 관리자 권한을 부여하게 되지요.
  - 이는 최소 권한 원칙(principle of least privilege) 에 위배됩니다.
- 위험성이 높음(risky): 예를 들어 스테이징 환경에서 프런트엔드 앱을 변경 시 오타나 잘못된 명령으로 프로덕션 데이터베이스를 삭제하는 대참사가 발생할 수 있습니다...
- 이해하기 어려움(understand) : 한 곳에 코드가 많을수록 한 사람이 모든 것을 이해하기가 더 어려워집니다.
- 리뷰하기 어려움(review) : 수집 줄의 코드로 구성된 모듈을 리뷰하는 것은 쉽지만, 수천 줄의 코드로 구성된 모듈을 리뷰하는 것은 거의 불가능입니다.
  - `terraform plan` 실행 시 오래 거리고, plan 명령의 출력이 수천 줄이며 아무도 코드를 읽으려 하지 않을겁니다.
  - 예를들어, 이 경우 데이터베이스가 삭제될 것임을 나타내는 빨간색 코드가 있더라도 누구 하나 발견하지 못할 수도 있습니다.
- 테스트하기 어려움(test) : 인프라 코드 테스트하기 매우 힘들어집니다! 다음 장에서 살펴보도록 하겠습니다.

따라서, 이런 이유로 인해 소형 모듈을 사용하는 편이 보다 좋은 코드가 되겠습니다.

#### 소형 모듈을 사용하는 방안

소형 모듈로 내용을 줄여보기 전에 클린코드에 나오는 격언 중 하나를 소개하면 좋은 대목인 것 같군요.

> 1. 함수의 첫 번째 규칙은 작아야한다는 것.
>
> 2. 함수의 두 번째 규칙은, 그보다 더 작아야한다는 것.

예시로 한번 살펴보겠습니다.

이런 아키텍처의 코드가 단 한줄뿐이라면..... 그것은 코드 스멜입니다! 코드 스멜은 더 큰 문제를 일으키기 쉬운 코드지요. 저는 냄새나는 코드라고 부릅니다.

기존 예시라면, 지난 7장에서 살펴본 ASG, ALB, 헬로월드 앱을 각각의 소형 모듈로 나누어봅시다.

![examples-of-complicated-aws-architecture](./media/01_examples-of-complicated-aws-architecture.jpg)

### 합성 가능한 모듈

여기서부턴 코드확인이 필요합니다. `chapter08` 디렉토리를 확인해주세요. 경로는 [여기](https://github.com/s3ich4n/terraform-study-101/tree/main/chapter08) 입니다. 베이스코드는 7장에서 작성한 코드입니다.

**재사용 가능하고 합성 가능한 모듈**

- **외부에서 상태를 읽는 대신 입력 매개 변수를 통해 전달하고, 외부에 상태를 쓰는 대신 출력 매개 변수를 통해 계산 결과를 반환합니다.**
- 모든 것을 입력 변수를 통해 전달하고 모든 것을 출력 변수를 통해 반환하며 간단한 모듈들을 결합해 더 복잡한 모듈을 만들수 있다.
- 실제 사용 시에는 더 나은 합성과 재사용을 위해 아래 실습 내용 보다 모듈을 더욱 세분화해야 할 수도 있습니다.

그러면, 코드 리팩토링을 진행해볼까요.

1. 기존 `webserver-cluster`는 하드코딩 되어있었고, 이를 아래와 같이 재작성합니다.
   1. variables 별도 분리를 통한 서브넷, 타겟 그룹명, 헬스체크 타입, `user_data` 변경 가능하도록 수정
      1. 유연한 변경이 가능하도록 작성
      1. 기본 서브넷이 아니라, 개별 VPC, 서브넷으로 사용가능
      1. 타겟 그룹명, 헬스체크 타입 변수로 ASG를 로드 밸런서와 통합
   1. 출력변수 추가
      1. output 변수를 통해

### 테스트 가능한 모듈

수정한 코드를 직접 구동해봅시다.

1. `asg-rolling-deploy` 모듈을 사용하여, 크기 1인 ASG를 배포하는 코드를 봅시다.

```terraform
terraform {
  required_version = ">= 1.0.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

# 모듈을 사용하여, 상기 리팩토링을 통해 수정한 내용을 쉽게 배포할 수 있게 되었습니다!
#
# 개인적으로는, 모듈 직전의 코드를 직접 쳐봐야 모듈화를 할 수 있는 통찰이 생기고,
# 이를 통해 프로비저닝 및 배포를 테라폼으로 할 수 있다고 생각합니다.
module "asg" {
  source = "../../modules/cluster/asg-rolling-deploy"

  cluster_name  = var.cluster_name

  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"

  min_size           = 1
  max_size           = 1
  enable_autoscaling = false

  subnet_ids        = data.aws_subnets.default.ids
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}
```

배포 및 확인은 아래 코드로 진행하면 됩니다.

```bash
# [터미널1] RDS 생성 모니터링
while true; do aws rds describe-db-instances --query "*[].[Endpoint.Address,Endpoint.Port,MasterUsername]" --output text  ; echo "------------------------------" ; sleep 1; done

# RDS 배포
cd chapter08/examples01/small-modules/examples/mysql

# 환경변수에 지정
export TF_VAR_db_username='cloudneta'
export TF_VAR_db_password='cloudnetaQ!'

terraform init && terraform plan
terraform apply -auto-approve

# [터미널2]
while true; do aws ec2 describe-instances --query "Reservations[*].Instances[*].{PublicIPAdd:PublicIpAddress,InstanceName:Tags[?Key=='Name']|[0].Value,Status:State.Name}" --filters Name=instance-state-name,Values=running --output text ; echo "------------------------------" ; sleep 1; done

# 배포
cd chapter08/examples01/small-modules/examples/asg
terraform init
terraform plan
terraform apply -auto-approve

# ALB 배포
cd chapter08/examples01/small-modules/examples/alb
terraform init && terraform plan
terraform apply -auto-approve

# ALB DNS주소로 curl 접속 확인
ALBDNS=$(terraform output -raw alb_dns_name)
while true; do curl --connect-timeout 1  http://$ALBDNS ; echo; echo "------------------------------"; date; sleep 1; done
curl -s http://$ALBDNS
```

### 릴리즈 가능한 모듈(버저닝)

#### Validations

테라폼 0.13부터 등장한 validation blocks 은 입력 변수를 체크할 수 있습니다.

```terraform
variable "instance_type" {
  description = "The type of EC2 Instances to run (e.g. t2.micro)"
  type        = string

  # t2.micro 혹은 t3.micro만 사용할 수 있도록 체크하는 로직입니다!
  validation {
    condition     = contains(["t2.micro", "t3.micro"], var.instance_type)
    error_message = "Only free tier is allowed: t2.micro | t3.micro."
  }
}
```

만일 validation에 실패한다면, 아래와 같은 에러 메시지를 리턴하게 됩니다.

```terraform
$ terraform apply -var instance_type="m4.large"
│ Error: Invalid value for variable
│
│   on main.tf line 17:
│    1: variable "instance_type" {
│     ├────────────────
│     │ var.instance_type is "m4.large"
│
│ Only free tier is allowed: t2.micro | t3.micro.
│
│ This was checked by the validation rule at main.tf:21,3-13.
```

#### Versioned Modules

인프라 코드는 오늘 실행하든 3년후에 실행하든 동일한 결과를 얻을 수 있어야 합니다. 테라폼 코어, 프로바이더 및 버전을 명시하여 이를 가능하게 합니다.

- 모듈 버저닝

  - 테라폼 코어(`core`를 의미): 테라폼 실행파일 버전을 `required_version` 이란 값으로 명시합니다.

  ```terraform
  terraform {
    # Require any 1.x version of Terraform
    required_version = ">= 1.0.0, < 2.0.0"
  }

  # 프로덕션은 완전히 구체적인 버전을 지칭하는 것이 좋습니다.
  terraform {
    # Require any 1.x version of Terraform
    required_version = "1.2.3"
  }
  ```

  - 프로바이더 버전: 프로바이더 버전 또한 `require_providers` 블록으로 명시합니다.

  ```terraform
  terraform {
    required_version = ">= 1.0.0, < 2.0.0"

    required_providers {
      aws = {
        source  = "hashicorp/aws"
        version = "~> 4.0"
      }
    }
  }
  ```

  - 모듈 버전: 모듈 자체의 버전 명시를 의미합니다. 이는 테라폼 코드일테니 Semantic version 관리 및 Git의 `tag`를 사용하는 방법이 있겠습니다.

### 테라폼 모듈 그 외의 것들은? (추가예정)

아래 사항들이 있습니다:

- Provisioners
- Provisioners with null_resource
- External data source

# Lessons Learned

제 8장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. DevOps 파트 또한 깊고 어렵고, "삽질"이 많습니다. 쉽지 않은 파트이며 항상 감사히 생각해야겠습니다.
1. 프로덕션 레벨에서 성공적으로 구동하기 까지는 정말 어렵고 힘든 길임을 이해했습니다.
1. 테라폼 코드를 프로덕션 레벨에서 사용하는 예시를 통해 **재사용 가능한 모듈** 단위의 사용을 학습했습니다.
   1. 작고, 테스트 가능하고 합성 가능한 모듈을 작성해야 합니다.
   1. 버전을 명시화하여 언제든 동일한 결과를 얻을 수 있어야 합니다.

이것으로 제 8장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
