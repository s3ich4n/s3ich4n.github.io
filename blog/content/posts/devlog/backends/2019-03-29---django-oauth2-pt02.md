---
title: "Autentication OAuth2 w/ django-social-auth pt. 1"
date: "2019-03-29T12:00:00.000Z"
template: "post"
draft: false
slug: "oauth2-with-django-social-auth-pt2"
category: "devlog"
tags: 
  - "Django"
description: "Django에서 django-social-auth를 사용하여 OAuth2 인증을 사용하는 방법에 대해 이어서 설명합니다."
---

# Pipeline, Strategy and Storage

## Pipeline이란?

`python-social-auth`는 확장성있는 파이프라인 메커니즘을 쓴다. 이를 통해 authentication, association, disconnection 중 임의의 함수를 추가로 사용할 수 있다.

함수는 현재 프로세스와 연관된 여러 변수들을 매개변수로 받는다. 이는 각각 `strategy`, `user`, `request`이다. `**kwargs`를 파라미터로 추가해두어 예상치못한 매개변수를 처리하도록 하는 것이 좋다.

## Strategy란?

가능한 한 많은 코드를 재사용하여 공통 API 하에서 다른 프레임 워크 기능을 캡슐화하기 위해 여러 strategy들을 정의해 두었다.

Strategy가 서비스하는 범위는 다음과 같다:

* 데이터, 호스트의 정보를 받기, 주어진 경로에 대한 URI 빌딩
* 세션 액세스
* 프로젝트 세팅
* 응답 타입 (HTML 혹은 리다이렉트)
* HTML 렌더링

서로 다른 프레임워크들이 다르게 구현되어있더라도 이런 인터페이스를 통해 해당 기능을 사용하는 것이 권장된다.

새로운 Strategy를 구현하려면 아래 링크의 요소들이 구현되어 있어야 한다:

[링크 참조](https://python-social-auth-docs.readthedocs.io/en/latest/strategies.html#implementing-a-new-strategy)

## Storage란?

프레임워크들은 서로다른 ORM을 제공한다. Storage는 공통 인터페이스를 mixin 클래스로 API들을 모아두었다. 기본 파이프라인과 그에 대해 구현해야 할 부분은 [해당 링크](https://python-social-auth.readthedocs.io/en/latest/storage.html)를 참조하길 바란다.

`SQLAlcehmy ORM`과 `Django ORM`의 일부 mixin은 구현되어있다.
[Django ORM 의 일부 구현체](https://github.com/python-social-auth/social-app-django/blob/master/social_django/storage.py)는 링크를 참조하길 바란다.

## Authentication Pipeline?

인증 파이프라인에는 기존에 제공되는 파이프라인을 쓰거나 사용자 파이프라인을 추가해서 사용할 수 있다.

```python
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.mail.mail_validation',
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
```

이름|역할
-|-
social_auth.social_details|유저에 관련된 정보를 가지고와서 유저 인스턴스를 만들 수 있도록 리턴한다
social_auth.social_uid|인증하는 서비스의 social uid를 받아온다
social_auth.auth_allowed|현재 인증 프로세스가 현재 프로젝트에 유효한지 검증한다
social_auth.social_user|소셜계정이 현재 사이트에 이미 associate 되어있는지 체크한다
user.get_username|해당 유저의 username을 세팅한다. 충돌이 있다면 끝에 random string을 추가한다
mail.mail_validation|이메일 인증을 받아야 계정이 유효하도록 만든다. 기본적으로 `disable` 되어있다
social_auth.associate_by_email| 현재 소셜 세부 정보를 비슷한 이메일 주소를 가진 다른 사용자 계정과 연결한다. 기본적으로 `disable` 되어있다
create_user| user 계정이 없다면 만든다
social_auth.associate_user|소셜계정이 유저와 associate한 레코드를 생성한다
social_auth.load_extra_data|소셜 레코드의 extra_data 필드에 설정에 지정된 값(기본값은 access_token 등)을 채운다
user.user_details|기존 인증 서비스로부터 변경된 유저 레코드 정보를 업데이트한다

각 파이프라인 함수는 아래 파라미터들을 받는다.
* 현재 strategy(이는 현재 storage, backend, request에 액세스할 수 있게 해준다)
* 인증 제공자에게서 받은 유저ID, 유저 상세정보
* `is_new` 플래그 (기본값은 `false`)
* auth_complete 백엔드 메소드로부터 받은 arguments. 기본적으로 이 arguments들이 온다
    * 현재 로그인한 유저. 아니라면 `None`
    * 현재 request

## 파이프라인 확장

파이프라인의 주요목적은 확장성에 있다. 함수 중간에서 데이터를 만들고, 모델 인스턴스를 만들고, 유저에게 다른 데이터를 요청하거나, 프로세스를 멈추게 할 수도 있다.

파이프라인을 확장하는건 아래과정이 필요하다.

1. 함수작성
2. import할 수 있을 곳에 위치
3. 새로 만든 함수를 포함시켜 파이프라인 정의에 오버라이딩. 단, 순서가 중요하다.
    * `social_core.pipeline.user.create_user`뒤에 사용자 정의 함수를 선언하면 이 함수는 user상태를 None값이 아니라 in-stance(만들어져있거나 이미 있는 상태)로 가져온다. 

파이프라인 함수는 사용중인 백엔드, 다른 모델 인스턴스, 서버 요청 및 공급자 응답에 이르기까지 상당히 많은 인수를 갖게된다.

* `strategy`
    * 현재 strategy 인스턴스.
* `backend`
    * 현재 백엔드 인스턴스.
* `uid`
    * 서비스 제공자의 UID. 이 값으로 현재 서비스 제공자의 유저를 판별한다.
* `response = {}` or `object()`
    * 서버의 유저 상세정보 응답이다. 이 값은 현재 사용중인 프로토콜에 의존적이다. 보통은 `dict` 타입으로 정보를 넣어둔다.
* `details = {}`
    * 백엔드에 의해 기본적으로 생성된 유저의 상세정보다. 유저 모델의 상세정보를 생성, 수정할 때 사용한다. 이 `dict`는 `username`, `email`, `first_name`, `lastname`, `fullname`을 담고있다.
* `user = None`
    * DB 생성, 조회여부에 따라 유저 인스턴스, 혹은 `None`값.
* `social = None`
    * DB 생성, 조회여부에 따라 주어진 유저에 대한 `UserSocialAuth` 인스턴스값, 혹은 `None`값.

일반적으로 커스텀 파이프라인 함수를 작성할 때, `response` 파라미터로부터 값을 얻어온다. 그 외에도 더 할 수 있다. API 엔드포인트를 호출해서 더 많은 정보를 불러오거나 다른곳에 저장하거나 하는 것도 가능하다.

예를들어 페이스북에서 가져온 response값을 보고, 유저의 프로필링크, 성별, Profile 모델의 타임존을 구하는 코드를 작성한다고 해보자:

```json
{
    'username': 'foobar',
    'access_token': 'CAAD...',
    'first_name': 'Foo',
    'last_name': 'Bar',
    'verified': True,
    'name': 'Foo Bar',
    'locale': 'en_US',
    'gender': 'male',
    'expires': '5183999',
    'email': 'foo@bar.com',
    'updated_time': '2014-01-14T15:58:35+0000',
    'link': 'https://www.facebook.com/foobar',
    'timezone': -3,
    'id': '100000126636010',
}
```

이런식의 값이 오면 다음과 같이 조립할 수 있다:

```python
def save_profile(backend, user, response, *args, **kwargs):
    if backend.name == 'facebook':
        profile = user.get_profile()
        if profile is None:
            profile = Profile(user_id=user.id)
        profile.gender = response.get('gender')
        profile.link = response.get('link')
        profile.timezone = response.get('timezone')
        profile.save()
```

다만 이 새로운 함수는 `SOCIAL_AUTH_PIPELINE`의 해당 라인에 위치해야한다.

```python
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'path.to.save_profile',  # <--- 함수위치를 여기 세팅
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
```

위의 함수는 {}가 리턴되듯 None이 리턴된다. 만일 해당변수를 다음 파이프라인에서도 쓰고싶다면 `{'profile':profile}`을 리턴하면 된다.
