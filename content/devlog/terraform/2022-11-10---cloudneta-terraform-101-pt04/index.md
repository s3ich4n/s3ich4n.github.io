---
title: "[CloudNet@] 테라폼 스터디 4주차 - Terraform의 module에 대하여"
date: "2022-11-10T04:11:57.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-11-10-cloudneta-terraform-101-pt04"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform의 module 에 대한 소개와, 어떻게 활용하는지, 그리고 주의사항과 모듈 버전관리에 대한 내용을 담았습니다."
socialImage: { "publicURL": "./media/terraform04.jpg" }
---

이 내용은 CloudNet@ 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

---

# Prerequisites

- 학습용 링크를 공유합니다.
  - [(당근페이) 박병진님 - 확장 가능한 테라폼 코드 관리를 위한 원칙](https://www.youtube.com/watch?v=yWhwZpzJ3no&t=2504s)

# 테라폼의 모듈에 대하여

테라폼의 모듈이 등장하게 된 배경에 대해 살펴보고, 주의사항은 어떤 것이 있는지 알아봅시다.

- 모듈은, 둘 이상의 환경에서 코드 재사용, 여러 테라폼 리소스를 하나의 논리적 그룹으로 관리하기 위해 사용합니다.
  - E.g., 스테이징, 프로덕션 환경에서 공통적으로 사용되는 코드를 `modules` 같은 디렉토리에 빼고, 파일경로를 참조하여 사용하는 것이 바로 그 방안입니다.

테라폼의 모듈은 아래와 같이 분류됩니다.

- Root module

  - 모든 Terraform 구성에는 기본 작업 디렉토리 의 파일에 정의된 리소스로 구성된 _루트 모듈_ 이라고 하는 하나 이상의 모듈 이 있습니다.

- Child module

  - Terraform 모듈(일반적으로 구성의 루트 모듈)은 다른 모듈을 _호출_ 하여 해당 리소스를 구성에 포함할 수 있습니다. 다른 모듈에 의해 호출된 모듈을 종종 _자식 모듈이라고 합니다._

    자식 모듈은 동일한 구성 내에서 여러 번 호출할 수 있으며 여러 구성에서 동일한 자식 모듈을 사용할 수 있습니다.

- Published module

  - 로컬 파일 시스템의 모듈 외에도 Terraform은 공개 또는 비공개 레지스트리에서 모듈을 로드할 수 있습니다. 이렇게 하면 다른 사람이 사용할 수 있도록 모듈을 게시하고 다른 사람이 게시한 모듈을 사용할 수 있습니다.
  - [Terraform Registry](https://registry.terraform.io/browse/modules)에서 가져오거나, Terraform Cloud, Terraform Enterprise 같은 서비스를 사용하여 참조할 수 있습니다.

그렇다면 테라폼 모듈을 가져오는 소스는 어떤 것이 있을까요?

- 로컬경로
- Terraform Registry
- GitHub
- Bitbucket
- GCS buckets, S3 buckets
- Terraform Registry
  - 하시코프에서 공식적으로 운영하는 테라폼 프로바이더 및 모듈 저장소, 공개된 모듈을 쉽게 활용 가능합니다.
  - [[Github] terraform-aws-modules](https://github.com/terraform-aws-modules) : 하시코프 ambassador 중 한 명인 Anton Babenko 가 리드, 가장 인기 있는 AWS 테라폼 모듈을 관리하는 Github 조직입니다.

## 모듈 기본

- 폴더에 있는 모든 테라폼 구성파일은 모듈입니다.
- 현재 작업 디렉토리의 모듈은 루트 모듈이라고 부릅니다.

모듈을 사용하기 위한 구문은 아래와 같습니다:

```hcl
module "<NAME>" {
  source = "<SOURCE>"

  [CONFIG ...]
}
```

- **NAME**
  - 테라폼 코드 전체에서 참조하기 위해 사용하는 **식별자**입니다.
- **SOURCE**
  - `modules/services/webserver-cluster` 와 같은 모듈 코드를 찾을 수 있는 **경로**입니다.
- **CONFIG**
  - 그 모듈과 관련된 특정한 하나 이상의 인수로 구성됩니다.

모듈을 적용하거나 source 파라미터를 수정하는 경우 반드시 `terrraform init` 명령 실행이 필요합니다.

다시말해 `init` 명령어 하나로 손쉽게 프로바이더와 모듈을 다운로드하고 백엔드를 구성할 수 있습니다.

## 모듈의 입력값

## 모듈과 지역변수

## 모듈과 출력

## 모듈 사용 시 주의사항

모듈을 사용할 때, 아래의 주의사항에 대해 참고해주세요.

### 파일 경로 File paths, 인라인 블록 Inline blocks에 대하여

파일 경로(File paths)

- 루트 모듈에서 file 함수 사용은 가능하지만, 별도의 폴더에 정의된 모듈에서 file 함수를 사용하기 위해서 경로 참조 path reference 표현식이 필요합니다.

  - `path.module` : 표현식이 정의된 모듈의 파일 시스템 경로를 반환

  - `path.root` : 루트 모듈의 파일 시스템 경로를 반환

  - `path.cwd` : 현재 작업 중인 디렉터리의 파일 시스템 경로를 반환

  - 사용자 데이터 스크립트의 경우 모듈 자체에 상대 경로가 필요하므로 `modules/services/webserver-cluster/main.tf` 의 `templatefile` 데이터소스에서 `path.module` 사용

인라인 블록(Inline blocks)

- 일부 테라폼 리소스는 인라인 블록 또는 별도의 리소스(권장)로 정의 할 수 있습니다.

- 다만 인라인 블록으로 규칙을 정의한 경우에는 코드가 작동하지 **않습니다!**. 아래와 같은 유사한 리소스를 사용하면 그런 문제가 발생할 수 있습니다:

  - `aws_security_group` 과 `aws_security_group_rule`
  - `aws_route_table` 과 `aws_route`

  - `aws_network_acl` 과 `aws_network_acl_rule`
  - 등등...

- (스터디 중 논의) 이런 값들은 일일이 코드로 작성하는 편이 좀 더 변화에 유연하다고 하는 지적이 있었습니다.

## 모듈 버전관리

모듈에 대한 버전관리를 통해, 특정 환경(스테이징, 프로덕션 등)별로 보다 세부적인 관리를 진행하는 방안에 대해 소개합니다.

- 여러 Repository를 통해 관리하는 전략을 소개하고자 합니다.
  - 테라폼 모듈로 분리하고자 하는 로직은 별도의 Git repository를 생성하고, Git의 tag 기능을 활용하여 버저닝을 수행합니다.
  - 인프라를 관리하는 Git Repository에서는 아래 방안을 사용합니다.
    - 상기 테라폼 모듈 로직에 대해 submodule로 추가하고, 스테이징/프로덕션에 대하여 tag에 기재한 버전을 사용합니다.

# Lessons Learned

제 4장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. 테라폼의 모듈 사용으로 인해, 코드 재사용과 여러 테라폼 리소스에 대한 논리적 관리를 꾀할 수 있습니다.
2. 모듈 사용법을 읽고, 반복되는 내용을 어떻게 효과적으로 제어하는지 알아볼 수 있습니다.
3. 특히 주요 주의사항과 모듈 버전관리 전략에 대해 읽고, 모듈 사용시 의도치 않은 실수를 하지 않도록 대비할 수 있습니다.

이것으로 제 4장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
