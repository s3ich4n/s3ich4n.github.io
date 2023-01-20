---
title: "[CloudNet@] 테라폼 스터디 7주차 - 총복습"
date: "2022-12-10T19:34:00.000Z"
template: "post"
draft: false
slug: "/devlog/terraform/2022-12-10-cloudneta-terraform-101-pt07"
category: "devlog"
tags:
  - "terraform"
  - "iac"
  - "devops"
description: "여태 스터디를 하며 배웠던 부분에 대한 one-point lesson을 해봅시다."
socialImage: { "publicURL": "./media/terraform07.jpg" }
---

이 내용은 [CloudNet@](https://www.notion.so/gasidaseo/CloudNet-Blog-c9dfa44a27ff431dafdd2edacc8a1863) 에서 진행하는 테라폼 기초 입문 스터디에 대한 연재글입니다.

스터디에서 사용하는 교재는 [Terraform Up & Running 2nd Edition](http://www.yes24.com/Product/Goods/101511312) 입니다.

# Prerequisites

- 따로 없습니다. 어차피 처음부터 다시 밟아갈거에요.

# 본문

이번 장은, 1장부터 6장까지의 내용을 리와인드하는 장으로 하기로 하였습니다. 중간 스터디를 하면서도 복습했지만 스터디 모임이 한 주 쉬어가며 문서화를 하여 개념을 스스로 정리해야겠다 싶었습니다.

## 테라폼 복습

### 아키텍처

- 전과 크게 다르지 않습니다!
- ALB, ASG, EC2 구성대로 진행합니다.
- staging, production 환경을 나눕니다.
- 모듈을 활용하여 무중단 업그레이드를 진행합니다.

### 도구 안내

- `tfenv` 를 통한 테라폼 버전관리를 수행해봅시다. 저는 리눅스 환경에서 실습을 진행하므로, 공식 repository에 작성된 Manual 설치대로 진행하겠습니다.

```bash
# ${HOME}/.tfenv에 관련 내용 설치
git clone --depth=1 https://github.com/tfutils/tfenv.git ~/.tfenv

# 사용하고있는 쉘에 따라 ${PATH} 추가.
# 저는 zsh을 사용하고 있습니다.
# 해당명령 수행 후 쉘을 종료하고 다시 켜주세요.
echo 'export PATH=$PATH:$HOME/.tfenv/bin' >> ~/.zshrc

# 설치 가능 버전 확인
tfenv list-remote | head
1.4.0-alpha20221109
1.3.6
...

# 현재 설치된 버전 확인
tfenv list
No versions available. Please install one with: tfenv install

# 특정 버전 설치
#(옵션) export TFENV_ARCH=arm64  # mac Apple silicon M1/M2
tfenv install 1.2.3
tfenv list

# 특정 버전 사용
tfenv use 1.2.3
Switching default version to v1.2.3
Default version (when not overridden by .terraform-version or TFENV_TERRAFORM_VERSION) is now: 1.2.3

# 테라폼 버전 확인
terraform version
on linux_amd64
```

### 자격증명 리전 변경

오하이오 리전(`us-east-2`)으로 변경합시다.

저는 direnv를 사용하고 있으므로, 작업이 필요한 하부 워킹디렉토리에 `.envrc` 파일을 생성 후 `AWS_DEFAULT_REGION` 을 오하이오 리전으로 변경하여 사용하였습니다. 아래 커맨드로 바꾸고, 확인해봅시다.

```bash
# AWS_DEFAULT_REGION 수정
vi .envrc

# direnv 내의 추가/수정된 .envrc 파일을 사용합시다.
direnv allow

# 반영여부 확인
aws configure list
      Name                    Value             Type    Location
      ----                    -----             ----    --------
   profile                <not set>             None    None
access_key     ************REDACTED              env
secret_key     ************REDACTED              env
    region                us-east-2              env    ['AWS_REGION', 'AWS_DEFAULT_REGION']
```

## 코드 분석

먼저, 영문 개정 3판의 코드를 클론합시다.

```bash
git clone https://github.com/brikis98/terraform-up-and-running-code.git
cd terraform-up-and-running/code/terraform
```

### 테라폼 문법 분석파트

테라폼 교재 예시의 가장 기본입니다. 위에서 설명드린 아키텍처에 작성된 내용을 코드로 배포하는 것이 주요 내용인지라, 해당 내용을 이해하고 넘어가야 다음 진도를 이해하며 넘어가실 수 있습니다!

1. (신규) 테라폼 구동 버전과 프로바이더의 버전을 기재하였습니다.
   1. 이 부분은 버전 명시 및 프로바이더에 대한 명확한 기재를 의미합니다.
   1. 향후 리팩토링을 수행하며, 관련 중요성에 대해 다시 말씀드리겠습니다.
1. 구동할 EC2 이미지를 찾고, 임의의 유저 데이터를 추가해두었습니다.
1. 기본 VPC에 서브넷을 생성하고, 시큐리티 그룹을 설정하였습니다.
1. ALB 설정이 존재합니다
1. ASG 설정이 존재합니다

아래 명령으로 구동을 진행할 수 있습니다.

```bash
# [터미널2]
cd 02-intro-to-terraform-syntax/webserver-cluster
cat main.tf variables.tf

# 배포
terraform init
terraform plan
terraform apply -auto-approve

# 배포 완료 후 ALB 접속 확인
ALBDNS=$(terraform output -raw alb_dns_name)
while true; do curl --connect-timeout 1  http://$ALBDNS/ ; echo; echo "------------------------------"; date; sleep 1; done

# 삭제
terraform destroy -auto-approve
cd ~/terraform-up-and-running-code/code/terraform
```

### 테라폼 state 파트

이 장에서는, `.tfstate` 파일이나 폴더구조 관리에 대해 배웠습니다. 관리를 제대로 하지 않았을 때의 리스크는 [이 링크](https://charity.wtf/2016/03/30/terraform-vpc-and-why-you-want-a-tfstate-file-per-env/)를 다시 봅시다...

1. S3, DynamoDB와 RDS(MySQL)을 통해, `.tfstate` 파일에 대한 관리를 진행합니다.
   1. RDS에 .tfstate 내용을 백업하고, S3에 읽기 전용 파일로 다른 서비스들이 "읽을 수 있도록" 준비합니다.
1. 스테이징/프로덕션 파트의 RDS를 배포하여, 서비스가 구동됨을 확인합니다.

아래 명령으로 구동을 진행할 수 있습니다.

- S3/DynamoDB 구동관련 설정

```bash
# 환경변수에 지정
export TF_VAR_bucket_name=ex07-tfstate
export TF_VAR_table_name=ex07-t101-locks
export TF_VAR_bucket_name=ex07-t101-tfstate
export TF_VAR_table_name=ex07-t101-locks

# 환경변수 확인
export | grep TF_VAR_

# (옵션) 환경변수 지정 삭제
unset TF_VAR_bucket_name
unset TF_VAR_table_name
```

- S3/DynamoDB 배포하기

```bash
#
cd 03-terraform-state/file-layout-example/global/s3
cat main.tf variables.tf

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포
terraform apply -auto-approve

# 확인
aws s3 ls
aws dynamodb list-tables --output text

# 이동
cd ../..
```

- RDS 배포하기

```bash
# [터미널1] RDS 생성 모니터링
while true; do aws rds describe-db-instances --query "*[].[Endpoint.Address,Endpoint.Port,MasterUsername]" --output text  ; echo "------------------------------" ; sleep 1; done

# [터미널2]
cd stage/data-stores/mysql
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_username='cloudneta'
export TF_VAR_db_password='cloudnetaQ!'

# 환경변수 확인
export | grep TF_VAR_

# main.tf 에 백엔드 부분 수정
vi main.tf
  backend "s3" {
    # This backend configuration is filled in automatically at test time by Terratest. If you wish to run this example
    # manually, uncomment and fill in the config below.
    bucket         = "ex07-tfstate"
    key            = "stage/data-stores/mysql/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "ex07-t101-locks"
    # encrypt        = true
  }

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포 : RDS는 생성 시 6분 정도 시간 소요
terraform apply -auto-approve
terraform output
aws s3 ls s3://$TF_VAR_bucket_name --recursive --human-readable --summarize

# 이동
cd ../..
```

- (상기 과정을 마쳐야 할 수 있습니다!) 웹서버 클러스터 배포하기

```bash
#
cd services/webserver-cluster
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_remote_state_bucket=$TF_VAR_bucket_name                       # description = "The name of the S3 bucket used for the database's remote state storage"
export TF_VAR_db_remote_state_key='stage/data-stores/mysql/terraform.tfstate'  # description = "The name of the key in the S3 bucket used for the database's remote state storage"

# 환경변수 확인
export | grep TF_VAR_

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포
terraform apply -auto-approve

# ALB DNS주소로 curl 접속 확인
ALBDNS=$(terraform output -raw alb_dns_name)
while true; do curl --connect-timeout 1  http://$ALBDNS ; echo; echo "------------------------------"; date; sleep 1; done
curl -s http://$ALBDNS

# 삭제
# 각 폴더에서 리소스 삭제
stage/services/webserver-cluster$ terraform destroy -auto-approve
stage/data-stores/mysql$ terraform destroy -auto-approve
global/s3$ terraform destroy -auto-approve

# 이동
cd ~/terraform-up-and-running-code/code/terraform
```

### 테라폼 모듈 파트

테라폼 state 파트에서 작성해본 내용들을 모듈화하여, 보다 효율적인 테라폼 코드를 작성해봅시다. 코드 재사용, 여러 테라폼 리소스를 논리적 그룹으로 묶을 수 있습니다. 논리적으로 구상할 수 있다는 것은 우리의 사고대로 코드들을 재배합할 수 있다는 이야기지요.

여기서는 웹서버 내용에 대해서만 아직 모듈로 묶어두었고, 8장에서 ALB, ASG, EC2가 묶여있는 부분을 해제해봅시다.

- 상기 내용과 동일합니다!

  - S3/DynamoDB 구동관련 설정
  - S3/DynamoDB 배포하기

- Staging RDS 배포하기

```bash
# [터미널1] RDS 생성 모니터링
while true; do aws rds describe-db-instances --query "*[].[Endpoint.Address,Endpoint.Port,MasterUsername]" --output text  ; echo "------------------------------" ; sleep 1; done

# [터미널2]
cd 04-terraform-module/module-example/stage/data-stores/mysql
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_username='cloudneta'
export TF_VAR_db_password='cloudnetaQ!'

# 환경변수 확인
export | grep TF_VAR_

# main.tf 에 백엔드 부분 수정
vi main.tf
  backend "s3" {
    # This backend configuration is filled in automatically at test time by Terratest. If you wish to run this example
    # manually, uncomment and fill in the config below.
    bucket         = "ex07-tfstate"
    key            = "stage/data-stores/mysql/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "ex07-t101-locks"
    # encrypt        = true
  }

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포 : RDS는 생성 시 6분 정도 시간 소요
terraform apply -auto-approve
terraform output
aws s3 ls s3://$TF_VAR_bucket_name --recursive --human-readable --summarize

# 이동
cd ../../
```

- (상기 과정을 마쳐야 할 수 있습니다!) Staging 웹서버 클러스터 배포하기

```bash
#
cd services/webserver-cluster
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_remote_state_bucket=$TF_VAR_bucket_name                       # description = "The name of the S3 bucket used for the database's remote state storage"
export TF_VAR_db_remote_state_key='stage/data-stores/mysql/terraform.tfstate'  # description = "The name of the key in the S3 bucket used for the database's remote state storage"

# 환경변수 확인
export | grep TF_VAR_

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포
terraform apply -auto-approve

# ALB DNS주소로 curl 접속 확인
ALBDNS=$(terraform output -raw alb_dns_name)
while true; do curl --connect-timeout 1  http://$ALBDNS ; echo; echo "------------------------------"; date; sleep 1; done
curl -s http://$ALBDNS

# 삭제
# 각 폴더에서 리소스 삭제
stage/services/webserver-cluster$ terraform destroy -auto-approve
stage/data-stores/mysql$ terraform destroy -auto-approve
03-terraform-state/file-layout-example/global/s3$ terraform destroy -auto-approve # 아래 Production 실습을 이어서 할 경우에는 실습 완료 후 삭제 할 것

# 이동
cd ~/terraform-up-and-running-code/code/terraform
```

cf. Production 배포는 `04-terraform-module/module-example` 의 prod 디렉토리의 RDS와 웹서버 클러스터를 배포하면 됩니다.

### tips and tricks: 무중단 배포 관련

무중단 배포(zero-downtime deployment)의 경우, 수정된 테라폼 코드나 환경변수를 사용하여 `terraform apply` 를 하면 끝입니다. 배포과정은 상기 내용과 동일하지만, 모듈을 활용하여 배포하는 단계가 다릅니다. 여기서는 배포가 "어떻게" 되는지를 살펴보겠습니다.

- 상기 내용과 동일합니다!
  - S3/DynamoDB 구동관련 설정
  - S3/DynamoDB 배포하기
- Staging RDS 배포하기

```bash
# [터미널1] RDS 생성 모니터링
while true; do aws rds describe-db-instances --query "*[].[Endpoint.Address,Endpoint.Port,MasterUsername]" --output text  ; echo "------------------------------" ; sleep 1; done

# [터미널2]
cd 05-tips-and-tricks/module-example/stage/data-stores/mysql
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_username='cloudneta'
export TF_VAR_db_password='cloudnetaQ!'

# 환경변수 확인
export | grep TF_VAR_

# main.tf 에 백엔드 부분 수정
vi main.tf
  backend "s3" {
    # This backend configuration is filled in automatically at test time by Terratest. If you wish to run this example
    # manually, uncomment and fill in the config below.
    bucket         = "ex07-tfstate"
    key            = "stage/data-stores/mysql/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "ex07-t101-locks"
    # encrypt        = true
  }

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan

# 배포 : RDS는 생성 시 6분 정도 시간 소요
terraform apply -auto-approve
terraform output
aws s3 ls s3://$TF_VAR_bucket_name --recursive --human-readable --summarize

# 이동
cd ../../
```

- (상기 과정을 마쳐야 할 수 있습니다!) Staging 웹서버 배포 후 **무중단 배포 진행**하기

```bash
#
cd services/webserver-cluster
cat main.tf variables.tf

# 환경변수에 지정
export TF_VAR_db_remote_state_bucket=$TF_VAR_bucket_name                       # description = "The name of the S3 bucket used for the database's remote state storage"
export TF_VAR_db_remote_state_key='stage/data-stores/mysql/terraform.tfstate'  # description = "The name of the key in the S3 bucket used for the database's remote state storage"

# 환경변수 확인
export | grep TF_VAR_

# 초기화 및 검증 : 환경변수 적용 확인
terraform init && terraform plan -var server_text='Old server text'

# 배포
terraform apply -auto-approve -var server_text='Old server text'

# ALB DNS주소로 curl 접속 확인
ALBDNS=$(terraform output -raw alb_dns_name)
while true; do curl --connect-timeout 1  http://$ALBDNS ; echo; echo "------------------------------"; date; sleep 1; done
curl -s http://$ALBDNS

# [터미널1]
ALBDNS=<직접입력>
while true; do curl --connect-timeout 1  http://$ALBDNS ; echo; echo "------------------------------"; date; sleep 1; done

# [터미널2]
while true; do aws ec2 describe-instances --query "Reservations[*].Instances[*].{PublicIPAdd:PublicIpAddress,InstanceName:Tags[?Key=='Name']|[0].Value,Status:State.Name}" --filters Name=instance-state-name,Values=running --output text ; echo "------------------------------" ; sleep 1; done

# 무중단 업그레이드 배포 : 환경변수 수정 적용 >> 오토스케일링그룹 2개중 기존 그룹은 5분 정도 후에 EC2가 삭제됨(오래 걸리니 맘 편히 기다리자)
terraform plan -var server_text='NEW server text'
terraform apply -auto-approve -var server_text='NEW server text'

# 삭제
# 각 폴더에서 리소스 삭제
stage/services/webserver-cluster$ terraform destroy -auto-approve
stage/data-stores/mysql$ terraform destroy -auto-approve
03-terraform-state/file-layout-example/global/s3$ terraform destroy -auto-approve

# 이동
cd ~/terraform-up-and-running-code/code/terraform
```

# Lessons Learned

제 7장에서는 아래의 내용을 반드시 기억하셨으면 좋겠습니다.

1. 테라폼을 사용하였을 때의 확실한 이점을 이해했습니다.
2. 예시의 내용이 _정확히_ 어떻게 되는지 이해할 수 있었습니다.
3. 향후 자신의 프로젝트나, 회사의 인프라 관리 코드들을 보고 이해할 수 있게 되었습니다.
4. 향후 나올 8장의 내용 이해 및 실제 프로덕션 레벨에서의 일부를 가정하여, 학습할 수 있게 되었습니다.

이것으로 제 7장을 마칩니다. 긴 글 읽어주셔서 감사합니다.
