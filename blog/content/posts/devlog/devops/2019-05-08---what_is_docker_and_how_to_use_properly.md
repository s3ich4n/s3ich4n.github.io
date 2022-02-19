---
title: "Docker pt.01 도커란 무엇이며, 어떻게 쓰는가?"
date: "2019-05-18T12:00:00.000Z"
template: "post"
draft: false
slug: "docker-explained-pt02"
category: "devlog"
tags: 
  - "DevOps"
description: "Docker를 알아봅시다. (1번째 글)"
---

# 도커가 당최 무어야?

## What is Docker?

`Docker` 란 개발자, 관리자가 앱에 대해 개발, 배포, 실행을 컨테이너와 함께 하기위한 플랫폼이다. 리눅스 컨테이너를 통해 앱을 배포하는 쓰임새를 _containerization_ 이라고 한다.

containerization은 가면 갈 수록 널리 퍼지고있는데, 그 이유는 다음과 같다:

* flexible함
* 경량화 되어있음
* 교체가능함
* 가벼움
* 크기조절이 쉬움
* 스택화 가능

## What is Images and Containers in Docker?

`Container`는 `Image`를 돌리는 것으로 작동된다. **Image** (이하 이미지)는 실행가능한 패키지이다. 이는 애플리케이션을 돌리기 위해 필요한 모든 것 (코드, 런타임, 라이브러리, 환경설정, 설정파일)을 포함하고 있다.

**Container** (이하 컨테이너)는 이미지의 런타임 인스턴스이다. 이는 실행했을 때 이미지가 메모리에 상주하는 것을 의미한다(즉, 이미지가 상태와 유저 프로세스를 가지고있는 것). 리눅스 상에서는 `docker ps` 명령어를 통해 동작중인 컨테이너의 리스트를 볼 수 있다.

## Containters and Virtual machines

컨테이너는 리눅스 상에서 _네이티브_ 하게 돌아가며 다른 컨테이너들과 함께 호스트 컴퓨터의 커널을 공유한다. 각각 독립적이지만 구별되는 프로세스로 작동하며 다른 실행파일과 다르게 메모리를 더 점유하지 않는다. 이런 점이 도커를 _가볍게_ 한다.

이와 대조되어 `가상머신(VM)`은 _가상의_ 접근을 가진 하나의 정교한 `guest` 운영체제로 돌아가며, `hypervisor`를 통하여 리소스를 제공한다. 일반적으로 VM은 대부분의 앱이 요구하는 것 보다 더 많은 리소스를 가진 환경을 제공한다.

# 도커란 어떻게 쓰는 것인가?

도커 설치는 CE 혹은 EE를 알맞은 플랫폼에 맞게 사용한다.

나는 맥을 사용하니 [이 링크](https://docs.docker.com/docker-for-mac/install/)를 타고 들어가서 Docker Desktop을 다운받았다.

다운로드 받은 후 버전을 알아보려면 이런식으로 나온다 

```shell
$ docker ---version
Docker version 18.09.2, build 6247962
```

설치한 `Docker`의 상세정보를 알아보려면 아래와 같이 입력하자

```shell
$ docker info

Containers: 0
 Running: 0
 Paused: 0
 Stopped: 0
Images: 0
Server Version: 18.09.2
Storage Driver: overlay2
...
```

`docker run <image-name>`을 수행하면 docker hub에 등록된 컨테이너를 다운로드 받거나 실행시킨다.

```shell
$ docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
1b930d010525: Pull complete 
Digest: sha256:92695bc579f31df7a63da6922075d0666e565ceccad16b59c3374d2cf4e8e50e
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
...
```

필요한 명령어는 [여기](https://docs.docker.com/engine/reference/commandline/cli/)서 찾거나, 필요에 따라 검색하길 바란다. 나는 [여기](https://daeson.tistory.com/290)가 도움이 되었다.

containerization은 CI/CD를 별 차이없이 만들었다.
* 애플리케이션이 시스템 의존을 가지지 않음
* 업데이트가 어떤 분산된 앱의 일부에도 추가될 수 있다.
* 자원 밀도를 최적화 할 수 있다. (앱이 달라짐에 따른 자원의 변화를 의미하는 것 같다)

도커를 쓰면 스케일 업은 새로운 걸 만드는 거지, 무거운 VM 호스트를 돌리는게 아니다.

# References

* [Get Started](https://docs.docker.com/get-started/)
* [Get started with Docker Desktop for Mac](https://docs.docker.com/docker-for-mac/)
* [도커 명령어](https://daeson.tistory.com/290)