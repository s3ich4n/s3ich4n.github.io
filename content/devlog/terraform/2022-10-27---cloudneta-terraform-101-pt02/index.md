---
title: "[CloudNet@] 테라폼 스터디 2주차 - Terraform 을 통한 VPC, ALB, ASG 배포 실습"
date: "2022-10-27T18:11:00.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-10-27-cloudneta-terraform-101-pt02"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform 코드를 통해 VPC 구성과 ALB, ASG 설정을 작성하고, 데이터 소스 블록에 대해 학습합니다."
socialImage: { "publicURL": "./media/terraform02.jpg" }
---

이 내용은 CloudNet@ 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 Terraform Up & Running 2nd Edition 입니다.

---

## Prerequisites

- AWS의 VPC 환경에 대한 이해
  - [[추천!] AWS 강의실 YouTube 채널의 VPC 강의](https://www.youtube.com/watch?v=FeYagEibtPE)
  - [Amazon VPC란 무엇인가? (위의 강의를 읽으신 후 일독하시면 크게 도움이 됩니다)](https://docs.aws.amazon.com/ko_kr/vpc/latest/userguide/what-is-amazon-vpc.html)
  - [제가 1주차 도전과제에 대해 공부하며, 요약한 게시글](https://github.com/s3ich4n/terraform-study-101/blob/main/chapter01/exercises/challenge01/README.md)
    - 도전과제 내용: AWS VPC에 대해 IaC화 후 EC2 웹서버를 추가하여 프로비저닝하기

아래에서 2주차 스터디 내용을 공유합니다.

교재의 2장 중, 코드내용 중 VPC 환경을 만들고 ASG/ELB 구축을 테라폼으로 진행합니다. 이와 함께 상태관리에 대해 다룹니다.

## VPC 환경 구축

아래 도식의 환경을 코드로 구성합니다:

예시코드는 아래 경로를 참고해 주세요.

- https://github.com/s3ich4n/terraform-study-101/tree/main/chapter02/exercises/required01

코드에 대한 설명은 다음과 같습니다:

- `required01_vpc.tf`
  - 프로바이더, VPC를 정의하여, VPC 환경을 작성하였습니다.
  - 서브넷을 나누었습니다.
  - 인터넷 게이트웨이를 통해 외부 통신을 사용하도록 하였습니다.
  - 라우팅 테이블을 통해 서브넷에서 어떤 라우팅 테이블을 타고 트래픽이 흐를 것인지 작성하였습니다.
- `required01_sg.tf`
  - 시큐리티 그룹을 정의하여, 인터넷 게이트웨이를 통한 ingress, egress 포트를 기재하였습니다.
- `required01_ec.tf`
  - 데이터 소스 블록(하단 참고)을 사용하여, AMI(AWS에서 관리하는 머신 이미지) 정보를 가져와 어떻게 사용할 것인지 코드로 작성했습니다.
  - `aws_instance` 선언 시, `ami` config을 수정하며 상기 데이터 소스 블록의 값을 사용했습니다.

## 데이터 소스 블록이란?

예시코드에 있는 내용 중, `data` 로 시작하는 구문은, 데이터 소스 블록을 의미합니다. 이는 아래와 같습니다:

- 테라폼을 실행할 때 마다 provider 별로 가져온 읽기 전용 정보를 의미합니다.
  - E.g., [`aws_ami`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami) 의 데이터 소스 블록은 이런 내용을 가지고 있습니다.
- 데이터 소스를 통하여 아래 내용을 사용할 수 있습니다.
  - 테라폼 외부에서 정의된 정보
  - 별도의 테라폼 구성으로 정의된 정보
- 다른 코드에서, `data.<provider>.<name>.<attribute>` 과 같은 방식으로 호출해올 수 있습니다.

데이터 소스 블록을 사용하는 방법은 아래와 같습니다:

```hcl
data "<PROVIDER>_<TYPE>" "<NAME>" {
  [CONFIG …]
}
```

> - PROVIDER : `aws` 같은 공급자의 이름
> - TYPE : `vpc` 같은 사용하려는 데이터 소스의 유형
> - NAME : 테라폼 코드에서 이 데이터 소스를 참조하는 데 사용할 수 있는 식별자
> - CONFIG : 해당 데이터 소스에 고유한 하나 이상의 인수로 구성됩니다.
>   - 아래의 예시는 `aws_vpc` 데이터 소스를 사용하여 기본 VPC(default vpc)의 데이터를 사용하는 구문입니다.

이런 방식으로 호출할 수 있지요:

```hcl
data "aws_ami" "s3ich4n-chapter02-ex01-amazonlinux2" {
  most_recent = true
  filter {
    name   = "owner-alias"
    values = ["amazon"]
  }

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-ebs"]
  }

  owners = ["amazon"]
}

resource "aws_instance" "s3ich4n-chapter02-ex01-ec2" {
  ami                         = data.aws_ami.s3ich4n-chapter02-ex01-amazonlinux2.id
  (중략)
}
```

## VPC환경에서 ALB, ASG 구축

이제 VPC 환경에서 ALB, ASG를 추가한 환경을 구축해보겠습니다. 도식은 아래와 같습니다:

예시코드는 아래 경로를 참고해 주세요.

- https://github.com/s3ich4n/terraform-study-101/tree/main/chapter02/exercises/required02

구축에 앞서 ALB와 ASG, 그리고 이 둘을 함께 사용하려면 어떻게 해야하는지에 대해 살펴보겠습니다.

### ASG란?

[AWS의 ASG(Auto Scaling Groups)](https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-groups.html)를 의미합니다. EC2 인스턴스의 자동적인 스케일링, 관리를 위해 논리적인 그룹으로 묶는 기능을 수행합니다.

- EC2 인스턴스 클러스터 시작, 인스턴스 상태 모니터링/교체, 부하에 따른 클러스터 사이즈 조정 등을 자동으로 해줍니다.
- 따라서, 운영하고자 하는 서비스의 트래픽 양에 따라 클러스터의 적절한 크기를 조절해야 합니다.
- 공부를 마치고, [AWS에 HA 및 scalable system 구축방법에 대한 링크](https://www.airpair.com/aws/posts/building-a-scalable-web-app-on-amazon-web-services-p1)를 읽어보시길 권장합니다.

ASG는 시작 구성정보를 참고하여 인스턴스를 생성하는데, 재배포를 한다면 시작구성을 변경할 수 없습니다.

- 따라서, 리소스 생성, 업데이트, 삭제 방법을 구성하는 수명주기(`lifecycle`) 설정을 추가해야 합니다.
  - `create_before_destroy` 설정을 이 때 사용합니다.
  - 테라폼은 리소스를 교체하는 순서를 반대로 하여 교체 리소스를 먼저 생성하고(이전 리소스가 가리키고 있던 참조를 업데이트하여 교체한 리소스를 가리킴) 기존 리소스를 삭제합니다.

### ALB란?

[AWS ALB(Application Load Balancer)](https://docs.aws.amazon.com/ko_kr/elasticloadbalancing/latest/application/introduction.html)를 의미합니다. 둘 이상의 AZ(Availability Zone, 가용 영역)에서 EC2, 컨테이너, IP 주소 등에 대해 들어오는 트래픽을 자동으로 분산하는 역할을 수행합니다.

→ 트래픽을 분산시키고, 외부에 노출시키는 IP 주소를 단일화합니다.

ALB의 주요 구성에 대해 알아보겠습니다:

- 리스너
  - 특정 포트, 특정 프로토콜에 대해 수신
- 리스너 규칙
  - 특정 경로에 대해 어디로 요청을 "대상 그룹"으로 보낼지 설정
- 대상 그룹
  - 요청을 받는 하나 이상의 서버

FYI, AWS에서는 로드 밸런싱을 위한 여러 서비스가 존재합니다.

- NLB (네트워크 로드 밸런서)
  - L4 레벨 트래픽 처리에 적합(TCP, UDP, TLS, etc.)합니다.
- CLB (클래식 로드 밸런서)
  - AWS의 레거시 로드밸런서입니다.
  - L7, L4 모두 가능하지만 새로 나온 서비스에 비하면 기능이 적습니다.

### ASG, ALB를 사용하려면?

**ASG, ALB를 함께 사용하려면?**

- 어떤 인스턴스 그룹을 바라보아야 할지 설정해야 합니다.
- 헬스체크 타입 추가(EC2 → ELB)가 필요합니다.
- LB healthcheck 룰을 추가해야합니다.

## Lessons Learned

제 2장에서는 테라폼을 사용하여 기본적인 환경구축을 수행하는 방법에 대해 배웠습니다. 또한 데이터 소스 블록에 대한 내용을 학습했습니다. 아래 내용을 반드시 기억하셨으면 좋겠습니다.

1. VPC 환경을 테라폼으로 표현하는 방법에 대해 배웠습니다.
2. VPC 환경에 ALB, ASG를 함께 구축하여 트래픽양에 따른 scale-out을 코드화 하였습니다
   1. 아직 정확히 어떤 시점에, 어떻게 스케일아웃을 하고 다시 원복해야 하는지에 대한 내용은 나오지 않았습니다!
   2. 후에 다시 기술할 예정입니다.
3. 데이터 소스 블록에 대해 배웠습니다.

이것으로 제 2장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
