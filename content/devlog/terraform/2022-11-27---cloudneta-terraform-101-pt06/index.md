---
title: "[CloudNet@] 테라폼 스터디 6주차 - Managing Secrets with Terraform"
date: "2022-11-27T22:19:00.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-11-27-cloudneta-terraform-101-pt06"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "Terraform을 사용하며 인프라 프로비저닝 및 배포 시, 민감정보에 대해 관리하는 방안에 대해 작성하였습니다."
socialImage: "./media/terraform06.jpg"
---

이 내용은 [CloudNet@](https://www.notion.so/gasidaseo/CloudNet-Blog-c9dfa44a27ff431dafdd2edacc8a1863) 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

특히 이 장은, [Terraform Up & Running 3rd Edition](https://www.oreilly.com/library/view/terraform-up-and/9781098116736/) 의 Managing Secrets with Terraform 장을 참고하여 학습하였습니다.

# Prerequisites

따로 있지 않습니다!

아래에서 6주차 스터디 내용을 공유합니다.

Terraform Up & Learning 3rd Edition 의 6장 내용을 다루고 있습니다.

# 본문

비밀번호를 누구든 알 수 없게 하면 안 된다는 것은 상식이지만, 방법을 모르면 사실상 비밀번호를 노출시키는 것과 다름 없기 때문에, 이를 관리하는 도구를 사용해야합니다. 이러한 이유로, 민감정보 값들은 프로비저닝 될 때 안전하게 관리 될 필요가 있습니다.

민감정보는 아래 값들을 의미합니다:

- DB 암호
- API 키
- TLS 인증서
- SSH 키
- GPG 키
- 등등..

## 암호 관리에 대하여

프로비저닝을 할 때 민감정보에 대한 절대적 법칙이 있습니다.

> 1. 민감 정보를 **절대 평문으로** 쓰지 맙시다.
> 2. 1번을 명심하십시오.

예를들어 이런 코드가 있다고 할까요?

```Terraform
resource "aws_db_instance" "example" {
  identifier_prefix   = "terraform-up-and-running"
  engine              = "mysql"
  allocated_storage   = 10
  instance_class      = "db.t2.micro"
  skip_final_snapshot = true
  db_name             = var.db_name

  # 절대로!!! 이러면!!! 안됩니다!!!!!!!!!!!!!!
  username = "admin"
  password = "password"
  # 절대로!!! 이러면!!! 안됩니다!!!!!!!!!!!!!! 진짜로!!!!
}
```

VCS (E.g., Git)에 이런 코드가 있다면, **누구든지**간에 AWS에 프로비저닝된 MySQL에 접근할 수 있습니다!

만일 이 코드를 누군가가 클론한다면, 다른 사람의 로컬에 ID/PW 정보가 저장될 수도 있겠죠. 그렇다면 ID/PW 에 대한 접근, 사용에 대한 통제 및 감사조차 할 수 없게 됩니다.

암호 관리 도구는 바로 이런 **치명적인** 부분 때문에 필연적으로 사용해야 하는 것입니다.

## 암호 관리 도구에 대하여

그렇다면 암호 관리 도구에 대한 필요성을 이해했으니, 암호 관리 도구에 저장되는 값과 암호관리 도구의 저장방식 및 암호관리 도구에 대한 접근 방식에 대해 살펴봅시다.

1. `The types of secrets you store` : 3가지 유형에 따라 관리 방식의 차이가 있습니다.

   1. `Personal secrets`: 개인 소유 암호 (내 웹사이트 접근 암호, SSH 키, 등...)
      - 이런 암호들은 개별 서비스들을 잘 쓰거나 하는 편이 좋겠지요(예시는 후술합니다!)
   2. `Customer secrets`: 고객 소유 암호 (고객의 개인정보, 고객의 이름/암호 등...)
      - 이런 암호들은 해싱 알고리즘을 사용해야겠지요.
      - Django 3.2 버전으로로 치자면, [PBKDF2 SHA256으로 해시를 `260,000`번 취한 값을 암호로 쓰는 것](https://docs.djangoproject.com/en/3.2/topics/auth/passwords/#how-django-stores-passwords) 처럼요([출처](https://github.com/django/django/commit/f2187a227f7a3c80282658e699ae9b04023724e5)).
   3. `Infrastructure secrets`: 인프라 관련 암호 (DB 암호, API 키값, 등...)
      1. 이런 암호들은 암/복호화 알고리즘을 사용하는 편이 좋겠지요.

2. `The way you store secrets` : 2가지 암호 저장 방식이 있습니다. 파일 기반 암호 저장이냐, 중앙 집중식 암호 저장이냐의 차이지요.

   1. `File-based secret stores` (파일기반의 암호 저장)
      1. 민감 정보를 암호화 후 저장하기 때문에 암호화 관련 키 관리가 중요합니다.
      2. AWS KMS, GCP KMS 혹은 PGP Key를 이용하는 케이스가 있겠군요.
   2. `Centralized secret stores` (중앙화된 암호 저장)
      1. 일반적으로 데이터베이스(MySQL, Psql, DynamoDB 등)에 비밀번호를 암호화하여 저장합니다.
      2. 암호화 키는 서비스 자체 혹은 클라우드 KMS(Key Management Service)를 사용합니다.

3. `The Interface you use to access secrets`: 암호관리 툴은 아래와 같이 사용할 수 있습니다.

   1. `API`
   2. `CLI`
   3. `UI`

4. `The Comparison of secret manegement tools`

   - 이러한 특성들을 가지고, 다양한 비밀번호 관리 도구를 살펴봅시다.

     |                              | Types of secrets | Secret Storage      | Secret Interface |
     | ---------------------------- | ---------------- | ------------------- | ---------------- |
     | HashiCorp Vault              | Infrastructure   | Centralized service | UI, API, CLI     |
     | AWS Secrets Manager          | Infrastructure   | Centralized service | UI, API, CLI     |
     | GCP Secrets Manager          | Infrastructure   | Centralized service | UI, API, CLI     |
     | Azure Key Vault              | Infrastructure   | Centralized service | UI, API, CLI     |
     | Confidant                    | Infrastructure   | Centralized service | UI, API, CLI     |
     | Keywhiz                      | Infrastructure   | Centralized service | API, CLI         |
     | sops                         | Infrastructure   | Files               | CLI              |
     | git-secret                   | Infrastructure   | Files               | CLI              |
     | 1Password                    | Personal         | Centralized service | UI, API, CLI     |
     | LastPass                     | Personal         | Centralized service | UI, API, CLI     |
     | Bitwarden                    | Personal         | Centralized service | UI, API, CLI     |
     | KeePass                      | Personal         | Files               | UI, CLI          |
     | Keychain (macOS)             | Personal         | Files               | UI, CLI          |
     | Credential Manager (Windows) | Personal         | Files               | UI, CLI          |
     | pass                         | Personal         | Files               | CLI              |
     | Active Directory             | Customer         | Centralized service | UI, API, CLI     |
     | Auth0                        | Customer         | Centralized service | UI, API, CLI     |
     | Okta                         | Customer         | Centralized service | UI, API, CLI     |
     | OneLogin                     | Customer         | Centralized service | UI, API, CLI     |
     | Ping                         | Customer         | Centralized service | UI, API, CLI     |
     | AWS Cognito                  | Customer         | Centralized service | UI, API, CLI     |

## Secret Management tools w/ Terraform

테라폼에서는 어느 시점에서 인증정보들이 노출될 수 있을까요? 바로 아래와 같은 지점에서 암호값이 노출될 수 있습니다.

1. Provider 기재 시 노출 (E.g., 프로바이더 인증 정보 등)
2. Resources and data sources 기재 시 노출(E.g., DB 암호 등)
3. State file and plan files (상태 파일, 플랜 파일 자체에 민감정보가 노출)

위의 리스트들에 대한 내용들을 아래에서 하나씩 살펴봅시다. 이 내용에 대한 에시코드는 `chapter06/exercises/01_providers` 에 있습니다. 링크는 [여기]()를 클릭해주세요.

### Provider 기재 시 암호값을 관리하는 방안

#### 프로바이더에서 노출

`provider` 선언 시 IAM 자격증명 정보를 노출하면 절대 안됩니다! 당장 인식할 수 있는 단점은 두가지입니다:

1. 자격증명 정보가 바로 노출됩니다!
2. 하나의 자격증명만 사용할 수 있습니다!

##### 환경변수를 사용하면?

- 장점
  - 자격증명 정보를 노출하지는 않습니다
- 단점
  - 여전히 PC에 평문으로 저장되어있습니다
  - 단독 자격증명만 사용할 수 있습니다.

##### 유저의 민감정보 유출 방지 방법

여러 서비스들을 사용할 수 있습니다.

1. 1Password/LastPass 등의 서비스 구매 후 사용
1. aws-vault 사용: [Github](https://github.com/99designs/aws-vault) [44bits 소개글](https://www.44bits.io/ko/post/securing-aws-credentials-with-aws-vault)을 참고바랍니다!

사용 예시

```bash
# mac 설치
brew install --cask aws-vault

# 윈도우 설치
choco install aws-vault  # 윈도우 Chocolatey
scoop install aws-vault  # 윈도우 Scoop

# 버전 확인
aws-vault --version
v6.6.0

# 설정
#aws-vault add <PROFILE_NAME>
aws-vault add t101
Enter Access Key Id: (YOUR_ACCESS_KEY_ID)
Enter Secret Key: (YOUR_SECRET_ACCESS_KEY)

# 확인
aws-vault ls
Profile                  Credentials              Sessions
=======                  ===========              ========
default                  -                        -
t101                     t101                     -

# 사용
#aws-vault exec <PROFILE> -- <COMMAND>
aws-vault exec t101 -- aws s3 ls
aws-vault exec --debug t101 -- aws s3 ls

aws-vault exec t101 -- terraform plan
aws-vault exec t101 -- terraform apply
```

`aws-vault` 를 사용하신다면, `~/.aws/credentials` 파일은 지우는게 좋습니다.

##### 기계의 민감정보 유출 방지 방법

프로덕션 레벨에서의 CI/CD 워크플로우 내용은 9장에서 살펴봅니다. 현재는 간단히 어떻게 사용되는지 정도만을 소개합니다.

1. [Providers] CircleCI as a CI server, with stored secrets : CI/CD 플랫폼인 CircleCI 를 통해 테라폼 코드를 실행한다고 가정

   - 영구자격증명은 IAM 룰과 다름에 주의합니다! 해당 단점을 없애기 위해 2번 예시를 살펴봅시다.

2. [Providers] EC2 Instance running Jenkins as a CI server, with IAM roles 실습 : EC2에 Jenkins 설치 후 CI서버로 테라폼 코드를 실행한다고 가정 시 IAM roles 활용 - [링크](https://github.com/brikis98/terraform-up-and-running-code/tree/master/code/terraform/06-managing-secrets-with-terraform/ec2-iam-role) (`chapter06/example01` 디렉토리를 참고바랍니다)

3. [Providers] GitHub Actions as a CI server, with OIDC : Github Actions 은 직접 자격 증명과 OIDC Open ID Connect 지원 (가장 발전되고 이해하면 훨씬 좋은 개념!)

OAuth 2.0를 기반으로 한 발전형 통신이 OIDC(OpenID Connect)입니다. 이걸 사용해서 인증을 수행하는 예시를 살펴봅시다. (cf. OAuth 2.0에 대해 모르신다면 생활코딩의 [OAuth 2.0 역할](https://www.youtube.com/playlist?list=PLuHgQVnccGMA4guyznDlykFJh28_R08Q-) 플레이리스트를 통해 공부하시는 것을 추천드립니다)

### Resource, Data source 기재 시 암호값을 관리하는 방안

마찬가지로, 리소스나 데이터소스 배포시에도 민감정보를 노출하면 절대 안됩니다! 이를 보완하기 위한 방법은 3가지가 있겠습니다.

이 내용에 대한 에시코드는 `chapter06/exercises/02_resources_and_data_sources` 에 있습니다. 링크는 [여기]()를 클릭해주세요.

##### 환경변수를 통한 민감정보 유출 방지

- 장점
  - 모든 언어에서 환경변수에 관련 값을 넣어 쓸 수 있습니다
  - 비용이 들지 않습니다.
- 단점
  - 팀원 모두가 환경변수를 수동으로 공유해야 합니다.

##### 암호화된 파일을 통한 민감정보 유출 방지

암호를 파일에 저장 후 버전 관리 → **암호화 키**를 클라우드 공급자 KMS를 통해 안전하게 저장 혹은 PGP 키 사용

> AWS KMS란?
>
> - 암호화는 키를 사용해 평문을 암호문으로 변환하는 프로세스다
> - 동일한 키를 사용해 암호문을 평문으로 변환할 수 있는데, 이를 복호화라고 한다
> - AWS 키 관리 서비스 **KMS**는 공유 하드웨어 보안 모듈HSM 을 사용하면서 **암호화키**를 **생성**하고 **관리**할 수 있게 도와준다
> - CloudHSM은 AWS 내에서 암호화키를 관리할 수 있지만 보안 강화를 위해 전용 HSM을 사용할 수 있는 서비스다
> - 용어 변경 참고 : 기존 Customer Master Key (**CMK**) → AWS **KMS key** 혹은 **KMS key** 로 변경 - [링크](https://docs.aws.amazon.com/kms/latest/developerguide/dochistory.html)

```bash
export ALIAS_SUFFIX=s3ich4n
aws kms create-alias --alias-name alias/$ALIAS_SUFFIX --target-key-id $KEY_ID

# KMS(구 CMK)로 평문을 암호화해보기
echo "Hello 123123" > secret.txt
aws kms encrypt --key-id alias/$ALIAS_SUFFIX --cli-binary-format raw-in-base64-out --plaintext file://secret.txt --output text --query CiphertextBlob | base64 --decode > secret.txt.encrypted


aws kms decrypt --ciphertext-blob fileb://secret.txt.encrypted --output text --query Plaintext | base64 --decode
Hello 123123
```

##### 중앙 집중식 비밀 저장소 서비스 사용을 통한 민감정보 유출 방지

중앙 집중식 비밀 저장소 서비스 사용 - AWS Secrets Manager, Google Secret Manager 등이 있지요.

### State file, Plan file 을 관리하는 방안

plan 파일안에는 모든 정보가 평문으로 저장되어있습니다. 따라서 두가지 방안을 반드시 사용할 것을 권장합니다.

1. 백엔드 저장소에 저장하는 시점에 암호화
2. 백엔드 액세스에 대한 접근 통제

# Lessons Learned

제 6장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. 암호 관리의 중요성은 더 이상 말할 필요가 없겠습니다.
2. 암호 관리 도구들은 어떤 목적을 가지고 있으며, 어떤 내용들이 있는지 살펴보았습니다.
3. 암호관리는 목적에 맞게 처리하는 것이 중요합니다.

이것으로 제 6장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
