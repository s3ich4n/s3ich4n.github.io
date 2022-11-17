---
title: "[CloudNet@] 테라폼 스터디 1주차 - Terraform의 기초"
date: "2022-10-20T16:34:00.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-10-20-cloudneta-terraform-101-pt01"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform의 등장배경과, 간략한 소개, 그리고 기초적인 예시를 통해 어떻게 사용하는지에 대한 내용을 담고 있습니다."
socialImage: "./media/terraform01.jpg"
---

이 내용은 [CloudNet@](https://www.notion.so/gasidaseo/CloudNet-Blog-c9dfa44a27ff431dafdd2edacc8a1863) 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

# 들어가며...

인프라를 코드를 통해 관리(Infrastructure as Code, 이하 IaC)하는 개념은 널리 퍼져있습니다. 이는 수동으로 운영하는 수고를 벗어나, 코드화하여 관리할 수 있는 이점을 지니기도 합니다.

그렇지만 올바르게 알아야 이를 적재적소에 사용할 수 있으며, 백엔드 개발에 대한 지식을 익혀둔 현 시점에 학습하면 협업 및 서브프로젝트 진행에 도움이 될 것이라고 판단하였습니다.

따라서 제가 공부한 내용을 남겨, 이해하고 배운 내용을 공유하려 합니다.

부디 이 내용이 도움이 되기를 바랍니다.

# 이 글의 대상은?

- 백엔드 개발 경험이 있으면서 인프라를 코드로 관리(Infrastructure as Code, IaC)하는 방법에 대해 알고싶은 분
- AWS, GCP, Microsoft Azure 등의 클라우드 컴퓨팅 서비스에 대한 기본 개념을 갖추신 분

# 목차

- [Prerequisites](#Prerequisites)
- [DevOps의 대두, IaC의 등장, 그리고 Terraform](#devops의-대두-iac의-등장-그리고-terraform)
- [Terraform 이란?](#terraform-이란)
- [테라폼에 대하여](#테라폼에-대하여)
  - [테라폼의 기본 개념](#테라폼의-기본-개념)
  - [테라폼 코드에 대하여](#테라폼-코드에-대하여)
  - [테라폼 구동방법](#테라폼-구동방법)
- [Lessons learned](#lessons-learned)

## Prerequisites

- [tfenv](https://github.com/tfutils/tfenv) 를 통한 테라폼 설치환경 분리
  - [참고링크 1](https://www.44bits.io/ko/post/managing-teraform-versions-with-tfenv)
- AWS의 IAM user 자격증명 설정
  - [AWS IAM에 대한 설명](https://blog.voidmainvoid.net/405)
  - [direnv](https://direnv.net/) 를 설치하여, 디렉토리 별 환경변수 설정
    - [참고링크 1](https://www.44bits.io/ko/post/direnv_for_managing_directory_environment)

아래에서 1주차 스터디 내용을 공유합니다.

교재의 1, 2장을 다룹니다.

## DevOps의 대두, IaC의 등장, 그리고 Terraform

과거에는 랙이나 캐비넷에 서버를 설치하고, 배선작업을 하고 쿨링 시스템을 설정하여 서버를 개발하던 시절이 있었습니다(물론 현재에도 여전히 유효하며, 필요에 따라서는 사용해야 합니다!). 이러한 시대에는 개발팀(Dev)과 운영팀(Ops)이 분리되어 하드웨어, 소프트웨어 파트를 각각 맡았으며 회사가 커짐에 따라 불필요한 수고가 많아졌습니다. [클라우드 컴퓨팅](https://ko.wikipedia.org/wiki/%ED%81%B4%EB%9D%BC%EC%9A%B0%EB%93%9C_%EC%BB%B4%ED%93%A8%ED%8C%85)의 시대가 도래하여 필요에 따라 하드웨어 제품을 "대여" 할 수 있게 되고, `Chef`, `Puppet`, `Terraform` 등과 같은 소프트웨어의 등장하여 이러한 수고를 "모든" 회사가 하지 않아도 되는 시대가 왔습니다. 이러한 시대의 흐름을 타고 개발과 운영이 한데 어우러진, 이른 바 "DevOps 운동"이 시작되었습니다. 소프트웨어 개발 전반에 필요한 프로세스와 방법론, 그리고 세부 기술에 대한 논의가 진행되는건 당연한 수순이라고 할 수 있겠네요.

따라서, DevOps는 아래와 같다고 할 수 있겠습니다:

> 소프트웨어를 효율적으로 전달하는 프로세스

IaC(Infrastructure as Code)는 이러한 DevOps를 할 수 있게 한 원동력입니다. 문자 그대로, 인프라환경을 코드로 작성할 수 있게 된 것이지요. 앞서 말씀드린 `Chef`, `Puppet`, `Terraform` 등과 같은 도구가 그 대상 중 하나입니다. 저희는 앞으로 그 중 하나인 `Terraform`(이하 테라폼)을 배우게 될 것입니다.

## Terraform 이란?

HashiCorp 에서 만든 IaC 도구입니다. 사람이 읽기 쉬운(human-readable) 설정파일을 통해 버저닝과 재사용, 그리고 팀원간의 공유를 할 수 있게 합니다.

코드화가 된다면, 코드를 작성할 때의 덕목을 모두 사용할 수 있음을 의미합니다. 따라서, 좋은 코드를 작성하기 위한 요소를 알고, Ops 파트의 특성을 공유한다면 보다 기민한 제품개발(뭐가 되었든!)을 할 수 있겠지요.

### IaC 도구의 장점

인프라를 코드 형식으로 작성하는 경우, 아래의 장점을 가져갈 수 있습니다.

- 자급식 배포 (**Self-service**): 배포 프로세스를 자동화 할 수 있으며, 개발자는 필요할 때마다 자체적으로 배포를 진행 할 수 있습니다.
- 속도와 안정성 (**Speed and safety**) : 제대로 작성된 코드는 자동/일관적이며, 사람이 발생시킬 수 있는 오류(human error)의 가능성이 현저히 적습니다.
- 문서화 (**Documentation**) : 시스템 관리자 조직만 인프라에 관한 정보를 독점하는 것이 아니라, 누구나 읽을 수 있는 소스 파일로 인프라 상태를 나타낼수 있습니다.
- 버전 관리 (**Version control**) : 인프라의 변경 내용이 모두 기록된 코드형 인프라 소스 파일을 저장할 수 있으므로 버전을 쉽게 관리할 수 있습니다. 또한 문제 발생 시 코드를 통한 원상복구가 가능합니다.
- 유효성 검증 (**Validation**) : 인프라 상태가 코드로 정의되어 있으면 코드가 변경될 때마다 검증을 수행하고 일련의 자동화된 테스트를 실행할 수 있습니다.
- 재사용성 (**Reuse**) : 인프라를 재사용 가능한 모듈로 패키징할 수 있어 검증된 모듈로 일관되게 배포할 수 있습니다.
- 이 모든게 되다니 행복해요(**Happiness**)!

## 테라폼에 대하여

아래에서 본격적으로 테라폼이 어떤 식으로 사용되는지에 대해 살펴보겠습니다.

### 테라폼의 기본 개념

테라폼에서 주요하게 사용되는 기본개념은 아래와 같습니다:

- **resource** : 실제로 생성할 인프라 자원을 의미
- **provider** : 테라폼으로 정의할 Infrastructure Provider(AWS, Microsoft Azure, GCP 등)를 의미
- **output** : 인프라를 프로비저닝 한 후에 생성된 자원을 `output` 부분으로 뽑을 수 있음. `output`으로 추출한 부분은 이후에 `remote state`에서 활용 가능
- **backend** : 테라폼의 상태를 저장할 공간을 지정하는 부분. `backend`를 사용하면 현재 배포된 최신 상태를 외부에 저장하기 때문에 다른 사람과의 협업이 가능
- **module** : 공통적으로 활용할 수 있는 인프라 코드를 한 곳으로 모아서 정의하는 부분. 이를 사용하면 변수만 바꿔서 동일한 리소스를 손쉽게 생성할 수 있음
- **remote state** : `remote state`를 사용하면 VPC, IAM 등과 같이 여러 서비스가 공통으로 사용하는 것을 사용할 수 있음. `tfstate`파일이 저장되어 있는 `backend` 정보를 명시하면, 테라폼이 해당 `backend`에서 `output` 정보들을 가져옴

### 테라폼 코드에 대하여

테라폼 코드의 실제 작성요소에 대해 간략히 정리하고자 합니다.

테라폼 코드는 HCL(Hashicorp Configuration Language) 로 작성합니다.

OS 마다 **바이너리** 파일이 존재하는데, Go코드는 하나의 바이너리 파일로 컴파일되며 `terraform <args>` 형식의 명령어로 실행합니다. 테라폼 바이너리가 `provider`를 대신해 API를 호출하여 리소스를 생성합니다. 테라폼은 인프라 정보가 담겨 있는 테라폼 구성 파일을 생성하여 API를 호출하지요.

확장자는 `*.tf` 입니다.

### 테라폼 구동방법

테라폼의 구동 후 프로비저닝[1] 은 크게 3단계로 나뉩니다.

- `terraform init` 을 통해 테라폼 프로젝트를 initialize
  - 지정한 backend에 상태 저장을 위한 `.tfstate` 파일을 생성합니다. 여기에는 가장 마지막에 적용한 테라폼 내역이 저장됩니다.
  - init 작업을 완료하면, local에는 `.tfstate`에 정의된 내용을 담은 `.terraform` 파일이 생성됩니다.
  - 기존에 다른 개발자가 이미 `.tfstate`에 인프라를 정의해 놓은 것이 있다면, 다른 개발자는 init작업을 통해서 local에 sync를 맞출 수 있습니다.
- `terraform plan` 을 통해 수행하고자 하는 동작을 테스트
  - 정의한 코드가 어떤 인프라를 만들게 되는지 미리 예측 결과를 보여줍니다. 단, plan을 한 내용에 에러가 없다고 하더라도, 실제 적용되었을 때는 에러가 발생할 수 있습니다.
  - **`terraform plan` 명령어는 어떠한 형상에도 변화를 주지 않습니다.**
- `terraform apply`를 통해 실제 프로비저닝을 수행
  - 실제로 인프라를 배포하기 위한 명령어입니다. apply를 완료하면, AWS 상에 실제로 해당 인프라가 생성되고 작업 결과가 backend의 `.tfstate` 파일에 저장됩니다.
  - 해당 결과는 local의 .terraform 파일에도 저장됩니다.

### 예시를 통한 `resource` 정의 방법 표현

실제로 생성할 인프라 자원에 대해 정의하는 방법은 아래와 같습니다.

```Terraform
resource "<PROVIDER>_<TYPE>" "<NAME>" {
  [CONFIG ...]
}
```

> - PROVIDER : 'aws' 같은 공급자의 이름
> - TYPE : 'security_group' 같은 리소스의 유형
> - NAME : 리소스의 이름
> - CONFIG : 한개 이상의 _arguments_

그렇다면, 예시코드를 보며 이해해보죠.

https://github.com/s3ich4n/terraform-study-101/blob/4e0b9159a443853311734cf0a839a11772290bbf/chapter01/example01/main.tf#L1-L12

- line 1~3: `provider` 정의를 통해 어느 프로바이더를 사용할지 기재합니다.
  - `region` 은 어느 지역의 장비를 사용할 것인지를 기재하는 것입니다.
  - [region에 대한 리스트](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html) 는 해당 링크를 참조해주세요.
- line 5~11: `resource` 에 대한 정의입니다. 어떤 프로바이더의 리소스를 사용할 것이며, 사용자가 정의한 이름을 사용하겠다는 의미이지요.
  - `config` 값은 리소스에 따라 다릅니다. 현재 사용한 [`aws_instance`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) 에 대한 상세한 내용은 이 링크를 참조해주세요.
  - pro tips) 향후 작업하시며, 테라폼의 공식문서를 많이 보시게 될 겁니다!

### 예시를 통한 참조(reference) 방법 표현

참조(reference)는 코드의 다른 부분에서 사전에 정의한 리소스의 특정 값에 액세스 할 수 있게 해주는 표현식을 의미합니다. 정의 방법은 아래와 같습니다.

```terraform
<PROVIDER>_<TYPE>.<NAME>.<ATTRIBUTE>
```

> - PROVIDER : 'aws' 같은 공급자의 이름
> - TYPE : 'security_group' 같은 리소스의 유형
> - NAME : 보안 그룹 이름인 'instance' 같은 리소스의 이름
> - ATTRIBUTE : 'name' 과 같은 리소스의 인수 중 하나이거나 리소스가 내보낸 속성 중 하나

예시1)

- `aws` PROVIDER의 `security_group` TYPE에 대해
- `instance`라는 이름의 NAME내의 `id` 라는 ATTRIBUTE 을 가져오려면?
  - `aws_security_group.instance.id`

* 종속성
  - 하나의 리소스에서 다른 리소스로 **참조**를 추가하면 내재된 **종속성**이 작성됩니다.
  - 테라폼은 종속성 구문을 분석하여 종속성 그래프를 작성하고, 이를 사용하여 리소스를 생성하는 순서를 **자동**으로 결정합니다.

### 변수(variables) 표현

변수(variables)는 자주 사용되는 값에 대해 변수값으로 별도의 `.tf` 파일에 기록하는 것을 의미합니다.

두가지 예시코드를 살펴보며 학습하겠습니다.

- `variables.tf` 파일에 분리된 예시코드
  - https://github.com/s3ich4n/terraform-study-101/blob/main/chapter01/example04/variables.tf
  - `server_port` 라는 변수를 정의하여, 다른 테라폼 파일에서 사용하도록 합니다.
- `main.tf` 파일에 작성된 프로바이더, 리소스 정의와 변수 참조
  - https://github.com/s3ich4n/terraform-study-101/blob/4e0b9159a4/chapter01/example04/main.tf
  - line 27~28: `var.server_port` 와 같이 변수값을 참조하여 사용

## Lessons learned

제 1장에서는 테라폼의 기본 내용을 살펴보았습니다. 아래 내용을 반드시 기억하셨으면 좋겠습니다.

1. 다양한 IaC 도구들의 등장과 클라우드 컴퓨팅의 등장으로, 개발과 운영은 새로운 패러다임을 맞이했습니다.
2. 테라폼의 기본적인 개념에 대해 익히고, 특정 프로바이더의 리소스를 사용할 수 있습니다.
3. 2에서 언급한 리소스의 값을 마치 변수처럼 "참조"할 수 있으며, 공통적으로 사용되는 상수값은 "변수"로 둘 수 있습니다.

이것으로 제 1장을 마칩니다. 긴 글 읽어주셔서 감사합니다.

---

[1]: "작성된 코드에 대한 환경을 배포한다" 로 이해하면 쉽습니다. 적절한 권한을 가진 유저가 인프라 구성 명령을 내려서 실제 인프라 구성을 수행하는 것이지요.
