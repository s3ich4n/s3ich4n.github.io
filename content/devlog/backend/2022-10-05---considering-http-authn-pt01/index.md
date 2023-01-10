---
title: "HTTP의 인증에 대해 (1) 인증의 발전사"
date: "2020-05-05T22:51:00.000Z"
template: "post"
draft: false
slug: "/devlog/backend/2022-10-05-considering-http-authn-pt01"
category: "devlog"
tags:
  - "web"
  - "backend"
description: "HTTP 기본 스펙을 이용한 기초적 인증부터 쿠키와 세션을, 그리고 갑자기 들불처럼 등장한 JWT이 뭔지까지만 살펴봅니다."
socialImage: "./media/domado.jpg"
---

이 시리즈에서는 HTTP의 인증(Authentication)에 대해 다룹니다.

이번 글에서는 HTTP의 인증이 어떤 방식으로 발전되어 왔으며, JWT가 뭐고 무엇인지를 다루도록 하겠습니다.

# 목차

- HTTP의 인증에 대해 (1)
- [HTTP의 인증에 대해 (2)](https://blog.s3ich4n.me/devlog/backend/2022-10-05-considering-http-authn-pt02)

# 인증(Authentication)과 인가(Authorization)?

헷갈리기 쉬운 인증과 인가부터 짚고 넘어가도록 하겠습니다.

- 인증

  - 서버가 유저에게, "리소스에 접근하는 당신이 누구십니까?"를 물어볼 수 있도록 하는 과정입니다. 쉽게말해 열쇠로 문을 여는 것이죠.
  - 유저가 인증을 하면, 서버는 "이 유저가 정말 맞는지" 감별합니다.
  - 유저가 인증에 성공했다면 `2xx` 응답을, 실패했다면 `4xx` 응답을 받을 것입니다.

- 인가

  - 서버가 유저에게, "리소스에 당신이 무엇을 할 수 있습니까?"를 물어볼 수 있도록 하는 과정입니다. 쉽게말해 권한부여 입니다.
  - 유저가 인가를 거쳐 리소스에 "요청"을 수행하면, 서버는 "이 유저가 할 수 있는 요청"인지 감별합니다
  - 유저의 권한이 올바르다면 `2xx` 응답을, 올바르지 않다면 `4xx` 응답을 받을 것입니다.

# 1. HTTP의 초창기 인증

데이터를 받아보는 당신이 누구인지를 묻는 요구사항은 HTTP/1.0 스펙부터 등장하였습니다[1]. 1996년부터 등장했고 현재는 사용하지 않습니다. 다만 어떤식으로 발전했는지를 살펴봅시다.

## `BASIC` 인증

- 유저명과 패스워드를 `base64(유저명 + ":" + 패스워드)`로 인코딩하여 아래와 같은 방식으로 헤더에 추가합니다.

```
Authorization: "Basic dXNlcjpwYXNz"
```

## `Digest` 인증

- 먼저 `401` 응답으로 거부를 받은 후, 거기서 얻은 정보를 가지고 재요청을 하는 것이 특징입니다.
- 공통된 해시 함수를 이용하여 서버와 유저 모두 인증에 필요한 값을 연산하여 "인증"을 수행합니다.
- 과정은 아래와 같습니다.

1. 보호된 영역에 접속하려할 때, `401 Unauthorized`를 받고, 서버로부터 특정 값을 받습니다(`handle_401` 호출).

   1. `WWW-Authenticate: Digest realm="영역명", nonce="임의의값", algorithm="알고리즘명", qop="auth"`
      1. 접근하고자 하는 영역(`realm`)
      1. 서버에서 무작위로 생성하는 데이터(`nonce`)
      1. 서버의 보호수준 (`qop`)
      1. `nonce`를 통해 호출한 횟수 (`nc`)

1. 유저는(사실은 유저의 클라이언트죠) `A1`, `A2`와, 무작위로 생성한 `cnonce` 라는 값을 토대로 `response`를 계산합니다(`build_digest_header`).

   1. `A1`: 유저명 ":" realm ":" 패스워드
   1. `A2`: HTTP 메소드 ":" 컨텐츠 URI
   1. `response`: MD5(MD5(`A1`) ":" nonce ":" nc ":" cnonce ":" qop ":" MD5(`A2`))

1. 서버측은 자신이 가진 유저명/패스워드와 위 과정에서 받은 정보를 가지고 "동일한"response를 계산하게 되면, 인증에 성공하게 됩니다.

## 옛 인증의 한계점

이런 인증을 현대에 대응하기에는 무리가 있습니다. 이유는 아래와 같습니다.

1. 요청/응답마다 매번 연산하는 것이 부담입니다.
1. 로그인 화면을 사용자화 하기 어렵습니다.
1. 명시적 로그오프 명령을 내리기 어렵습니다.
1. 로그인한 유저를 식별할 수 없습니다.

이러한 사항 때문에, [HTML의 `Form`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form)을 이용한 로그인과, 쿠키를 이용한 세션관리 조합으로 발달되게 되었습니다.

# 2. 쿠키와 세션을 사용한 인증

현대에까지 널리 사용되고 있는 브라우저 쿠키와 세션을 통한 인증이 있곘습니다. 아래에서 기본적인 개념을 살펴보겠습니다.

## 쿠키와 세션을 이용한 인증

- 유저는 Form을 통해 ID와 비밀전호를 직접 전송합니다.
  - 이 탓에 SSL/TLS가 필수입니다.
  - 보안 통신을 통해 HTTP 요청/응답을 주고받는 것은 HTTP/1.1 스펙부터 등장했습니다.
- 서버는 인증 후 문제가 없으면 세션 토큰을 발행해두고 자신의 데이터베이스에 저장합니다(장고에서의 방안은 아래에 후술합니다).
  - 이 때, 관련 토큰을 쿠키에 저장하도록 유저(클라이언트)에게 값을 돌려줍니다.
  - 이런 쿠키 사용에는 제약이 걸려있습니다.
  - 쿠키도 평문으로 갈 수 있고, 원칙상 유저가 쿠키를 변조해서 보낼 수도 있습니다(!)
  - 따라서 쿠키 사용에는 아래와 같은 제약이 걸릴 수 있지요.
    - 쿠키의 수명을 결정하기(`Expires`, `Max-Age` 속성)
    - 유저가 쿠키를 전송할 대상 서버 (`Domain` 속성)
    - 유저가 쿠키를 전송할 대상 서버의 경로 (`Path` 속성)
    - `HTTPS` 를 통한 접속일 때만 서버로 쿠키를 전송 (`Secure` 속성)
    - 자바스크립트 엔진으로부터 쿠키를 감추는 속성을 추가 (`HttpOnly` 속성)
    - (Chrome 브라우저 추가스펙) 동일한 Origin의 도메인에만 전송(`SameSite` 속성, 비표준입니다!)
- 인증을 마쳤으므로, 이후 쿠키를 재전송하고 서버에서는 "서명"을 확인하여 클라이언트를 재확인하며 서비스합니다. (인가는 그 다음 이야기겠지요.)

## 장고에서는?

여러 방법이 있겠습니다만, [장고에서 세션을 활용하는 방안](https://docs.djangoproject.com/en/4.1/topics/http/sessions/)은 여러가지가 있습니다.

세션을 어떤 식으로 관리할지에 대한 설정은 아래와 같습니다:

- Database-backend 세션관리
- Cached 세션관리
- file-based 세션관리
- cookie-based 세션관리

## Django REST Framework 에서는?

- [SessionAuthentication](https://www.django-rest-framework.org/api-guide/authentication/#sessionauthentication) 을 통해 구현됩니다. 이 값을 사용하면 장고 설정 내의 기본 세션정보(위의 4가지 방법 중 하나)를 따라갑니다. 필요에 따라 상기 장고에서의 설정값을 확실히 알아둬야 올바르게 쓸 수 있을 것입니다.

# 3. JWT(JSON Web Token)의 등장

이어서 JWT입니다. 우선은 간략하게 JWT가 무엇인지 살펴보겠습니다.

## JWT란?

JSON Web Token(JWT)는 2010년 10월 28일, 처음 발표되었습니다. 간략한 정보는 아래와 같습니다.

- [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) 로 발표된 proposed Internet standard 입니다.
- JSON을 상호간 안전하게 교환하려는 체계로써 제시된 토큰이지요(중요!)
- claim이란 값을 가진 JSON 페이로드와, 시그니처 데이터를 생성합니다.
- 이 토큰은 공개키/비밀키(RSA나 ECDSA 등)로 열고 잠그거나, shared secrets값(HAMC)을 통해 열고 잠글 수 있습니다.

소개는 이쯤하고, 구조를 먼저 살펴본 후 사용례를 살펴봅시다.

## 구조

JWT의 구조를 살펴봅시다. JWT는 헤더.페이로드.시그니처 의 세 부분으로 구성됩니다. `.`은 구분자로 사용됩니다.

JWT는 이런 모양을 가집니다.

`aaaaa.bbbbb.ccccc`

보다 정확한 스펙은 상술한 RFC 문서를 참고해주세요.

### 헤더

- 두 가지 값을 가집니다.

  - 알고리즘: 시그니처가 어떤 알고리즘으로 생성되었는지 식별합니다. 예를 들어 `HS256` 이라는 값은, `HMAC-SHA256`을 사용하여 이 토큰을 생성하였음을 의미합니다. 통상적으로 사용할 수 있는 알고리즘은 [이 링크](https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms-40)를 참고해주세요.
  - 타입: `JWT` 를 사용하거나 스펙에 맞게 사용합니다.

- 아래와 같은 모양으로 생겼습니다.

```
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### 페이로드

- `claim`의 모임입니다. 클레임은 크게 세 종류로 나눌 수 있습니다.
  - Registered Claim names
    - JWT 설계자들이 일반적으로 담아서 쓸만한 값들을 미리 정의한 값입니다. 아래와 같습니다
      - `iss`: 누가 이 토큰을 발급했는지를 표기합니다.
      - `exp`: 만기 시간을 기재합니다. (단위: miliseconds가 반영된 Epoch time)
      - `sub`: 토큰의 발급 목적을 의미합니다.
      - `aud`: 토큰을 받는 사람을 의미합니다.
      - `nbf`: 연산의 이유로 이 시간 전에는 토큰이 유효하지 않다는 시간을 의미합니다. (단위: miliseconds가 반영된 Epoch time)
      - `iat`: 언제 이 토큰이 발급되었는지를 의미합니다.
      - `jti`: JWT 토큰의 고유ID 입니다. 중복되지 않는 값으로 생성시켜야 합니다.
  - Public Claim names
    - [IANA JWT 레지스트리](https://www.iana.org/assignments/jwt/jwt.xhtml)에 정의되거나 중복 방지 등의 이유로 URI로 지정되기도 합니다.
  - Private Claim names
    - 말 그대로인 커스텀 클레임 값입니다. 상기 클레임들과 중복되지 않는 값입니다.
- 상기 클레임 값들을 필요에 따라 넣어서 사용할 수 있습니다. registered clame name에 속한 값을 반드시 사용하도록 강제되진 않으나, 해당 의미를 가지는 값이라면 기재된 이름을 쓰면 됩니다.

(!) claim: JWT에 의해 전달된 개별 값들이 구성원인 JSON 개체를 나타냅니다.

- 아래와 같은 모양으로 생겼습니다.

```
{
  "sub": "1",
  "name": "s3ich4n",
  "admin": false
}
```

### 시그니처

토큰이 유효한지 검증합니다. 시그니처는 [RFC 4648(Base64Url)](https://datatracker.ietf.org/doc/html/rfc4648)을 사용하여 헤더와 페이로드를 인코딩하기위해 계산됩니다. 그리고 구분자 `.`을 이용하여 둘을(헤더, 페이로드) 합칩니다. 이후 공개키/비밀키(RSA나 ECDSA 등)나 shared secrets값(HAMC)을 통해 시그니처를 생성합니다.

예를들어 HMAC SHA-256 알고리즘을 사용한다면, 시그니처는 아래와 같이 생성됩니다.

```
HMAC_SHA256(
  secret,
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload)
)
```

### 세 값을 모두 합치면?

이런 모양이 나옵니다.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dnZWRJbkFzIjoiYWRtaW4iLCJpYXQiOjE0MjI3Nzk2Mzh9.gzSraSYS8EXBxLN_oWnFSRgCzcmJmMjLiuyu5CSpyHI
```

# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. HTTP 상에서의 인증에 대해 Basic 부터 쿠키와 세션, JWT에 이르기까지를 간략히 살펴볼 수 있었습니다.
1. JWT가 무슨 목적으로 만들어졌으며, 어떤 구조로 이루어져 있는지 간략히 알 수 있었습니다.

다음 글에서는 JWT가 어떤식으로 인증(및 인가)에 쓰이게 되는지, JWT의 특성을 오해하고 잘못 사용중인건 아닌지 살펴보겠습니다.

읽어주셔서 감사합니다.

---

- References
  - [1] [해당 링크](https://www.w3.org/Protocols/HTTP/1.0/spec.html#BasicAA)를 참고해주세요.
  - [2]
