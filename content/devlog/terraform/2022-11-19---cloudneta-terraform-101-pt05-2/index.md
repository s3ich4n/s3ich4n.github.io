---
title: "[CloudNet@] 테라폼 스터디 5주차 - Terraform의 반복문과 조건문 (2) - 조건문"
date: "2022-11-19T21:59:57.000Z"
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

- 반복, 조건문 사용방법
- 무중단 배포에 필요한 요소들 사용방법
- 주의사항

## 조건문

# Lessons Learned

제 5장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. (중요!) Prerequisite에서, 테라폼의 타입과 값에 대한 내용은 이미 알고있어야 하는 주요한 내용이라고 봅니다.

   1. 프로그래밍 언어처럼 다루려면, 어떤 타입과 값을 사용할 수 있는지는 기본적으로 알아야 하기 때문입니다.

2. 반복문의 사용방법과 주의사항에 대해 배웠습니다.
3. 조건문의 사용방법과 주의사항에 대해 배웠습니다.

이것으로 제 5장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
