---
title: "인가를 다시 살펴보다 (1) OAuth 2.0 개요와 프로토콜 소개"
date: "2022-10-16T21:50:00.000Z"
template: "post"
draft: false
slug: "/devlog/backend/2022-10-16-considering-authn-and-authz-revisited-pt01"
category: "devlog"
tags:
  - "backend"
description: "API 서비스가 많이 나누어졌을 때, 인가에 대해 살펴보며 **인가** 에 사용되는 OAuth 2.0 스펙을 알아봅시다."
socialImage: { "publicURL": "./media/pomeranian.jpg" }
---

# 들어가며

필요한 API 서비스를 나누고 서비스의 규모가 커지면, 인증과 인가에 대해 구조적으로 돌아보게 됩니다. 그러면서 자연스럽게 SSO(IdP, SP)나 OAuth 2.0, OpenID Connect 같은 큰 개념을 돌아보게 되고, 어떻게 이를 위임하거나 전파할지를 구상하게 됩니다.

# Single-sign On(SSO) 이란?

단일 로그인입니다. 자기 서비스에 한번만 로그인 하면, 연관있는 다른 "서비스"를 로그인 없이 이용할 수 있게 하는 것이지요. 사용자에게는 여러 서비스를 한번에 쓸 수 있게끔 세팅해주는 것이고, 뒷단에서는 각 서비스에 대해 별도 인증시스템을 따로 꾸리지 않으며 사용자 접근관리를 하도록 합니다.

## SSO 구현 모델에 대해

SSO를 구현하는 구현모델 및 기법을 살펴봅시다. 여기서는 제가 이해한 모델에 대해서 기술하겠습니다.

### Delegation model

SSO 에이전트가 중앙에서 인증을 대행합니다.
대상 애플리케이션의 인증방식을 변경하기 어려울 때 서비스에 일일이 붙여주는 방식으로 사용합니다.
사용자의 인증 정보를 SSO 에이전트가 관리합니다(SPOF가 될 수 있겠지요).

![Delegation model의 도식<br />(출처: https://itwiki.kr/w/SSO)](./media/00_SSO_delegation_diagram.jpg)

### Propagation model

통합인증 서비스에서 인증을 수행하고 인증 토큰을 받아옵니다.
서비스 접근 시, 인증토큰을 서비스에 전달하고, 이를 가지고 사용자를 확인할 수 있는 구조입니다.

![Propagation model의 도식<br />(출처: https://itwiki.kr/w/SSO)](./media/00_SSO_propagation_diagram.jpg)

# OAuth 2.0이란?

유저에게 자신, 타인의 리소스에 접근할 수 있는 **권한을 토큰으로 부여** 하는 프로토콜([RFC 6749](https://tools.ietf.org/html/rfc6749))입니다.

## OAuth 2.0의 특징

OAuth 2.0은 인증 성공시 제한된 권한을 가진 **Access Token**과, 이를 갱신하는 **Refresh Token**을 동시에 발급받습니다. 이를 통해 유저별로 다양한 서비스에 대해 필요한 권한을 부여할 수 있습니다.

이처럼 권한을 부여하고 토큰을 관리하는 구조를 이해하는 것이 **OAuth 2.0의 핵심** 입니다.

## OAuth 2.0의 주요 용어

OAuth 2.0을 이해하기에 앞서, 용어를 정리해봅시다.

### 역할에 대해

OAuth 2.0을 구성하고 있는 주요 4가지 객체(Roles)는 다음과 같습니다. 이 글을 기술하며, 아래의 상황을 가정합시다.

> "나"는, "파이어폭스"로 "가나다" 서비스에서 "곰곰"이라는 서비스에 접근하는 권한을 주려합니다.

- Resource owner

  - Resource Server(후술할 서버)의 데이터의 주인, 즉 "나" 입니다(참고: 개인 뿐 아니라 회사 단위일 수도 있습니다).
  - 각자의 계정을 가지고 있지요.
  - 정보에 접근할 수 있는 범위(scope)를 스스로 지정합니다.
    - 외부 Resource Server에 어떤 행동을 할지에 대한 권한을 부여합니다.
    - read, write 뿐 아니라 다른 권한 또한 주고 빼고를 결정할 수 있습니다.

- Resource server

  - 일반 사용자(Resouce owner)의 정보를 가지고있는 API 서버입니다. 즉 "곰곰"이라는 서비스의 서버지요.
  - Access token을 사용하여 요청을 수신할 때, 권한을 검증한 후 적절한 결과를 응답합니다.
    - 권한이 있으면 값을 주고, 아니면 401이나 403을 리턴하겠죠.

- Client

  - `Resource owner`가 리소스에 접근하는 애플리케이션을 의미합니다. "가나다" 서비스에 접근하는 "파이어폭스" 이자, "가나다" 서비스 내부의 비밀정보를 저장하는 프로그램을 의미합니다.
  - 참고로, 이는 클라이언트는 노출될 수도, 내부에 존재할 수도 있습니다.
    - Confidential Client(이하 내부 클라이언트)는 사용자가 직접 관리할 수 없는 공간에 있습니다.
    - Public Client(이하 외부 클라이언트)는 브라우저, 모바일 앱, IoT 디바이스입니다.
  - 참고. Client 등록은 앱에 접근하기 위한 자격을 얻는 것을 의미합니다.

- Authorization server

  - OAuth 2.0 프레임워크가 구현된 **권한 부여** 처리용 서버입니다. "가나다" 서비스의 OAuth 2.0 처리서버를 의미합니다.
  - `Resource owner`를 인증한 후, Client에 대해 적절한 권한을 부여해줍니다.
  - `Access token`, `Refresh token`를 발급합니다.
    - `Access token`에는 각종 권한과 유효기간 등 주요정보가 들어가있습니다.

### 토큰에 대해

OAuth 2.0에서 "토큰"이란 아래와 같은 두 가지가 있습니다. 토큰을 어떤 스펙으로 정해야 하는지는 정해져있진 않습니다만, 주로 `JWT`를 사용합니다.

#### `Access token`

Access token의 주요 특징은 아래와 같습니다:

- 보호된 리소스에 접근하기 위해 필요한 토큰입니다.
- 살아있는 기간이 짧습니다. 보통 시간단위나 분단위입니다.
- 외부 클라이언트가 사용합니다.
- `Access Token` 만료시 `Refresh Token`으로 갱신합니다.

#### `Refresh token`

Refresh token의 주요 특징은 아래와 같습니다:

- 유효기간이 지나 만료된 `Access token` 을 갱신하기 위한 토큰입니다.
- 보통 일간, 월간, 연간 단위로 살아있을 수 있습니다.
- 외부 클라이언트가 **인증**을 하여 획득합니다.
- 갱신될 수 없으며, 유효기간이 만료되면 재로그인을 수행해야 합니다.
- "삭제(revoke)"가 가능하며, 그러면 더이상 **권한 부여**를 하지 않게 됩니다.

Refresh token에 담긴 주요 리소스들을 살펴보도록 합시다.

### 토큰과 연관된 엔드포인트

이 토큰은 **인증 서버**로부터 받아옵니다. 관련 엔드포인트는 `authorize`, `token` 이라는 두 개의 엔드포인트를 일컫습니다.

- `token` 엔드포인트
  - 상기 `authorize` 엔드포인트에 성공적으로 응답을 받고, `Access token` 과 `Refresh token` 을 받습니다.
- `authorize` 엔드포인트
  - 사용자로부터 동의 및 권한 부여, 유저에 대한 **권한 정보**를 받기 위해 이동하는 곳입니다.
  - "나"는 "가나다" 서비스로부터 "권한부여를 허용하시겠어요?" 와 같은 메시지를 받습니다.
- `introspect` 엔드포인트
  - Authorization Server가 Resource server에 접근하기 위해, `token` 엔드포인트로부터 받은 토큰을 물어보는 과정입니다.
  - "가나다" 서비스가 "곰곰" 서비스에 물어본다고 할 수 있지요.
  - "나"가 "파이어폭스"로 직접 해당 서비스를 호출할 수도 있습니다.
- `revoke` 엔드포인트
  - 사용하지 않을 `Refresh token`을 "만료시키는" 엔드포인트 입니다. 유저가 특정 앱에 대해 권한을 주지 않음을 명시할 때 호출합니다.

획득한 Access token으로 API에 접근할 때 사용하며, 만료되면 내부 클라이언트가 Refresh token을 가지고 Access token을 갱신합니다.

# OAuth 2.0의 작동방식

> 아래 내용을 시행하기에 앞서, 클라이언트는 자신의 서비스에 먼저 "로그인" 한 것을 가정한 것으로 이해하시면 됩니다. 저는 RFC 문서 상의 2.3. Client Authentication 을 보고 이를 판단했습니다:
>
> If the client type is confidential, the client and authorization server establish a client authentication method suitable for the security requirements of the authorization server. The authorization server MAY accept any form of client authentication meeting its security requirements. (후략)
>
> 그 후에 추가적인 "인가" 를 받고(OAuth 2.0) Resource Server에 통신하거나, 추가적인 "인증", "인가" 를 모두 받고(OpenID Connect) Resource Server와 통신하는 것으로 이해하시면 됩니다.
>
> 상세한 내용은 후술하겠습니다.

OAuth 2.0의 전체 프레임워크의 가장 기본적인 Flow는 다음과 같습니다.

```
          +--------+                               +---------------+
          |        |--(A)- Authorization Request ->|   Resource    |
          |        |                               |     Owner     |
          |        |<-(B)-- Authorization Grant ---|               |
          |        |                               +---------------+
          |        |
          |        |                               +---------------+
          |        |--(C)-- Authorization Grant -->| Authorization |
          | Client |                               |     Server    |
          |        |<-(D)----- Access Token -------|               |
          |        |                               +---------------+
          |        |
          |        |                               +---------------+
          |        |--(E)----- Access Token ------>|    Resource   |
          |        |                               |     Server    |
          |        |<-(F)--- Protected Resource ---|               |
          +--------+                               +---------------+

                          Figure 1: Abstract Protocol Flow
```

또한, 이 문서에서는 Front channel이란 용어와, Back channel이란 용어를 각각 사용하겠습니다. Front channel은 고객(클라이언트 사이드)과 연관있는 파트를, Back channel은 Authorization Server, Resource server 와 같이 프로그래머 및 서비스와 밀접한 관계가 있는 파트를 의미합니다.

## Front channel에서의 작업

"나"가 "파이어폭스"를 통해, "가나다" 서비스에서 "곰곰" 서비스로 요청하는 과정을 도식화한 것입니다. 여기서는 간략히 설명하겠습니다.

- (A): 클라이언트는 **인가**를 resource owner에 요청합니다. 인증요청은 resource owner에 직접적으로 요청되거나, authorization server를 중간에 거쳐서 수행합니다.
- (B): Resource owner는 Client에게 인증허가를 수행합니다. 인증허가 방법은 총 4가지가 있습니다. 인증허가 방식은 하단에서 자세히 후술하겠습니다. 여기서는 특징만을 기술합니다.

  - Authorization Code Grant

    - 클라이언트가 resource owner에게 권한부여를 요청하는 대신, resource owner가 authorization server에서 인증을 받고 권한을 허가합니다.
    - owner가 권한을 허가하면 authorization code가 발급되고 이를 클라이언트에 전달합니다.
    - 클라이언트는 authorization code를 authorization server에 코드를 보내며 권한허가 사실을 알리고 access token을 받습니다.
    - 후술할 Back channel과 Front channel이 확실히 분리되어 있어, 훨씬 안전합니다.
    - 해당 프로토콜의 다이어그램은 다음과 같습니다:
      ![Authorization Code Grant의 도식](./media/01-oauth-auth-code.png)

  - Implicit

    - Authorization code 방식에서 마지막의 코드 관련 통신을 뺀것입니다.
    - Refresh token을 지원하지 않습니다.
    - 이는 자격증명을 안전하게 저장하기 힘든 클라이언트에 최적화된 방식입니다. Resource Owner와 Client가 모두 한 디바이스인 것을 가정합니다.
    - 이러한 연유로 보안성이 낮아집니다. 주의해야 할 부분의 링크는 [여기를 참고](https://tools.ietf.org/html/rfc6749#section-10.16)해주세요.
      - Front channel에 Access token이 노출되는 케이스이기 때문입니다.

  - Resource Owner Password Credentials

    - 계정 인증정보(ID/PW) 같은 정보가 access token을 얻기 위한 authorizaion grant로 쓰입니다. access token을 얻으면 리소스 요청을 위해 ID/PW를 클라이언트가 보관할 필요는 없습니다.
    - 해당 프로토콜의 다이어그램은 다음과 같습니다:
      ![Resource Owner Password Credentials의 도식](./media/02-oauth-password.png)

  - Client Credentials

    - 자원 소유자가 유저가 아니고 클라이언트면 사용하는 방식.
    - client가 관리하는 리소스에 접근하는 경우로 권한이 한정되어있을 때 씁니다. 클라이언트 각각이 resource owner가 될 수 있습니다.
    - 해당 프로토콜의 다이어그램은 다음과 같습니다:
      ![Client Credentials의 도식](./media/03-oauth-client-creds.png)

참고) 인증 허가 후의 과정은 아래의 Back channel과도 밀접한 연관을 가집니다. Back channel에서의 플로우 및 상세 구현방법이 정해지기 때문입니다. 여기서는 개념만 짚고 넘어가도록 하겠습니다.

## Back Channel에서의 작업

유저에게 동의(consent)를 구하고, 클라이언트는 토큰을 통해 작업하는 큰 흐름에 대해 설명합니다. 상세한 구현방법은 상기 (B) 과정에 설명한 내용입니다. 아래 내용은 OAuth 2.0의 대략적인 플로우를 의미합니다.

- (C): 권한부여를 받은 클라이언트는 access token을 authorization server 에 요청합니다.
- (D): authorization server는 권한부여가 올바른지 유효성을 검증하고, 유효하다면 access token을 발급한 후 클라이언트에 결과를 보냅니다.
- (E): 발급받은 access token으로 client는 resource server에 리소스를 요청합니다.
- (F): resource server는 access token의 유효성을 점검 후 필요한 리소스를 줍니다.

# OAuth 2.0의 Grant flow에 대해

토큰 부여까지는 살펴보았고, 그렇다면 이제 그 토큰을 통해 어떤식으로 **권한 처리** 에 대한 플로우를 사용하는지 알아봅시다. 이 글에서는 Authorization Code Grant만을 살펴보도록 하겠습니다. 보다 더 상세한 스펙과 내용에 대해서는 RFC 문서를 참고해주시기 바랍니다.

## Grant flow에 대해

인가 이 후 어떤 식으로 동작하는지에 대해 살펴봅시다. Back channel에서 일어나는 일에 대해 보다 소상히 살펴본다고 생각하시면 됩니다.

### Authorization Code Grant

Authorization code grant type은 Access token과 Refresh token을 모두 얻는 데 사용되며 기밀 클라이언트에 최적화되어 있습니다. 이것은 리디렉션 기반 흐름이므로 클라이언트는 Resource Owner의 사용자 에이전트(일반적으로 웹 브라우저)와 상호 작용할 수 있어야 하며 Authorization Server에서 들어오는 요청(리디렉션을 통해)을 수신할 수 있어야 합니다.

```
          +----------+
          | Resource |
          |   Owner  |
          |          |
          +----------+
                ^
                |
              (B)
          +----|-----+          Client Identifier      +---------------+
          |         -+----(A)-- & Redirection URI ---->|               |
          |  User-   |                                 | Authorization |
          |  Agent  -+----(B)-- User authenticates --->|     Server    |
          |          |                                 |               |
          |         -+----(C)-- Authorization Code ---<|               |
          +-|----|---+                                 +---------------+
            |    |                                         ^      v
            (A)  (C)                                       |      |
            |    |                                         |      |
            ^    v                                         |      |
          +---------+                                      |      |
          |         |>---(D)-- Authorization Code ---------'      |
          |  Client |          & Redirection URI                  |
          |         |                                             |
          |         |<---(E)----- Access Token -------------------'
          +---------+       (w/ Optional Refresh Token)

        Note: The lines illustrating steps (A), (B), and (C) are broken into
        two parts as they pass through the user-agent.

                          Figure 3: Authorization Code Flow
```

#### 권한요청시

Authorization Code Grant 플로우 중, 권한요청 시에는 아래 request 쿼리값이 들어갈 수 있습니다. `application/x-www-form-urlencoded` 포맷으로 전송합니다.

| 필드명          | 필수여부    | 상세설명                                                                                                         |
| --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `response_type` | REQUIRED    | 반드시 `code` 라는 문자열이야 합니다.                                                                            |
| `client_id`     | REQUIRED    | Client identifier 값입니다.                                                                                      |
| `redirect_uri`  | OPTIONAL    | 토큰이 발급받을 위치를 지정합니다. 이 값을 엉뚱한 값으로 바꾸어 리소스에 접근할 수 없도록 하는 약속입니다.       |
| `scope`         | OPTIONAL    | 클라이언트가 수행할 수 있는 "범위"를 지정해주는 값입니다.                                                        |
| `state`         | RECOMMENDED | 요청-콜백 간 상태를 유지하기 위해 클라이언트 측에서 사용하는 opaque한 값입니다. CSRF를 방지하기 위해 사용됩니다. |

요청 예시는 아래와 같습니다:

```

GET /authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz
    &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb HTTP/1.1
Host: server.example.com
```

#### 권한응답시 (정상처리)

| 필드명  | 필수여부 | 상세설명                                                                                                                                                                                                                                                                                      |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`  | REQUIRED | Authrization 서버로부터 생성된 **권한 부여** 코드값입니다. 이 값은 악의적인 사용(유출되거나 하는 등)을 방지하기 위해 만료시간이 짧아야 합니다(`10분` 이 권장됩니다). <br />해당 값은 반드시 한번 이상 **사용할 수 없도록** 해야합니다. 한번 이상 사용한다면 요청을 **반드시** 거부해야합니다. |
| `state` | REQUIRED | 앞선 요청에 `state` 필드값이 있었다면, 요청과 동일한 값을 응답해줍니다.                                                                                                                                                                                                                       |

응답 예시는 아래와 같습니다:

```
HTTP/1.1 302 Found
Location: https://client.example.com/cb?code=SplxlOBeZQQYbYS6WxSbIA
          &state=xyz
```

클라이언트 측에서도 식별되지 않은 응답 파라미터는 **반드시** 무시해야합니다.

#### 권한응답시 (비정상 처리)

Authorization server는 아래 상황에 대해 에러를 리턴해야 하고, 잘못된 리디렉션 URI로 **반드시 가게해선 안 됩니다**.

| 필드명              | 필수여부 | 상세설명                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`             | REQUIRED | 에러를 표기하기 위한 `ASCII` 값입니다(알파벳 대소문자, 숫자 이외의 값은 포함하면 안됩니다). 값들은 아래와 같습니다: <br />`invalid_request`: 필수 파라미터를 포함하지 않았거나 잘못 사용한 경우 <br />`unauthorized_client`: 클라이언트가 해당 리소스를 사용하기에 적절한 권한이 없는 경우 <br />`access_denied`: Resource owner 혹은 Authorization server가 요청을 거부한 경우 <br />`unsupported_response_type`: Authorization server가 이 방법을 사용한 액세스 토큰 획득을 지원하지 않는 경우 <br />`invalid_scope`: 요청의 `scope` 값이 유효하지 않거나, 알려지지 않은 값이거나, 손상된 경우 <br />`server_error`: Authorization server 측의 예기치 않은 에러가 발생된 경우. `500 Internal Server Error` Response를 줄 수 없는 경우 사용합니다. <br />`temporarily_unavailable`: Authorization server 측의 과부화 혹은 점검의 이유로 인해 해당 요청을 처리할 수 없는 경우 사용합니다. `503 Service Unavailable` Response를 줄 수 없는 경우 사용합니다. |
| `error_description` | OPTIONAL | human-readable `ASCII` 텍스트. 클라이언트 개발자에게 보다 유용한 에러 메시지를 전달하기 위한 필드입니다. <br />알파벳 대소문자, 숫자 이외의 값을 포함하면 안됩니다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `error_uri`         | OPTIONAL | 클라이언트 개발자에게 보다 유용한 에러 메시지를 전달하기 위한 human-readable 웹페이지 URI 값입니다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `state`             | REQUIRED | 앞선 요청에 `state` 필드값이 있었다면, 요청과 동일한 값을 응답해줍니다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

1. URI 리디렉션이 잘못되었거나, 유효하지 않거나, 없는 값인 경우
1. Client identifier가 없거나 유요하지 않은경우

Authorization server가 요청을 거부한 경우에 대한 응답 예시는 아래와 같습니다.

```
HTTP/1.1 302 Found
Location: https://client.example.com/cb#error=access_denied&state=xyz
```

#### Token 발행 요청

HTTP request entity-body에 `UTF-8` 인코딩을 사용하고, `application/x-www-form-urlencoded` 포맷으로 보냅니다.

| 필드명         | 필수여부 | 상세설명                                                                                                                                 |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `grant_type`   | REQUIRED | 이 값은 **반드시** 문자열 `authorization_code` 값이어야합니다.                                                                           |
| `code`         | REQUIRED | Authorization server로부터 받은 authorization code 값입니다.                                                                             |
| `redirect_url` | REQUIRED | Authorization request 과정에서 해당 값이 포함되어 있었다면, **반드시** 그 값과 동일해야합니다.                                           |
| `client_id`    | REQUIRED | 클라이언트 자격증명에 사용됩니다. 클라이언트가 권한 서버에 등록하면 발급받을 수 있으며 권한 서버 연동 시 클라이언트의 검증에 사용됩니다. |

요청 예시는 아래와 같습니다:

```
POST /token HTTP/1.1
Host: server.example.com
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb
```

#### Token 발행 요청에 대한 응답 (정상처리)

해당 값 리턴 시, 헤더에 `Cache-Control: no-store` 값과 `Pragma: no-cache` 값이 **반드시** 존재해야 합니다. `Content-Type` 은 `application/json` 입니다.

| 필드명          | 필수여부    | 상세설명                                                                                                                                                        |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access_token`  | REQUIRED    | Authorization server로부터 발급받은 Access token 값입니다.                                                                                                      |
| `token_type`    | REQUIRED    | 발급한 토큰의 타입을 기재합니다. 대소문자를 구별합니다.                                                                                                         |
| `expires_in`    | RECOMMENDED | Access token의 유효기간입니다. <br />`3600` 이라면, 1시간 후 만료됩니다. 만약 이 값이 없다면 Authorization server에서 만료 시간을 기본값으로 정해주어야 합니다. |
| `refresh_token` | OPTIONAL    | Refresh token값입니다. 이 값은 동일한 authorization grant 과정에 사용되는 새로운 Access token을 발급받는데 사용됩니다.                                          |
| `scope`         | OPTIONAL    | 어떤 권한을 요청할 것인지에 대한 범위입니다. 유저별로 구별되어있다면 OPTIONAL이지만, 그렇지 않다면 REQUIRED 입니다.                                             |

응답 예시는 아래와 같습니다:

```
HTTP/1.1 200 OK
Content-Type: application/json;charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  "access_token":"2YotnFZFEjr1zCsicMWpAA",
  "token_type":"example",
  "expires_in":3600,
  "refresh_token":"tGzv3JOkF0XG5Qx2TlKWIA",
  "example_parameter":"example_value"
}
```

상단에서 살펴본 Access token과 Refresh token이 보입니다. 이를 통해 리소스 요청 및 Access token 갱신을 수행합니다. 또한 클라이언트 측에서도 식별되지 않은 응답 파라미터는 **반드시** 무시해야합니다.

#### Token 발행 요청에 대한 응답 (정상처리)

| 필드명              | 필수여부 | 상세설명                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`             | REQUIRED | 에러를 표기하기 위한 `ASCII` 값입니다(알파벳 대소문자, 숫자 이외의 값은 포함하면 안됩니다). 값들은 아래와 같습니다: <br />`invalid_request`: 파라미터가 잘못되거나, 클라이언트 인증에 문제가 있거나, 값이 변조된 경우 <br />`invalid_client`: 클라이언트 인증에 실패하는 경우 <br />`invalid_grant`: authorization grant 과정 혹은 refresh token이 잘못된 경우 <br />`unauthorized_client` : 클라이언트가 적절한 권한을 가지지 않은 경우<br />`unsupported_grant_type` : authorization server에서 지원하지 않는 authorization grant type인 경우 <br />`invalid_scope`: resource owner가 제공하지 않은 권한 밖의 `scope` 를 요청한 경우 |
| `error_description` | OPTIONAL | human-readable `ASCII` 텍스트. 클라이언트 개발자에게 보다 유용한 에러 메시지를 전달하기 위한 필드입니다. <br />알파벳 대소문자, 숫자 이외의 값을 포함하면 안됩니다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `error_uri`         | OPTIONAL | 클라이언트 개발자에게 보다 유용한 에러 메시지를 전달하기 위한 human-readable 웹페이지 URI 값입니다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

응답 예시는 아래와 같습니다:

```
HTTP/1.1 400 Bad Request
Content-Type: application/json;charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  "error":"invalid_request"
}
```

또한 클라이언트 측에서도 식별되지 않은 응답 파라미터는 **반드시** 무시해야합니다.

#### Access token 갱신

권한서버는

| 필드명          | 필수여부 | 상세설명                                                                                                            |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `grant_type`    | REQUIRED | 이 값은 **반드시** `refresh_token` 이라는 문자열이어야 합니다.                                                      |
| `refresh_token` | REQUIRED | 클라이언트에게 발급된 refresh token 값입니다.                                                                       |
| `scope`         | OPTIONAL | 어떤 권한을 요청할 것인지에 대한 범위입니다. 유저별로 구별되어있다면 OPTIONAL이지만, 그렇지 않다면 REQUIRED 입니다. |

요청 예시는 아래와 같습니다

```
POST /token HTTP/1.1
Host: server.example.com
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
```

## 그 외?

- 상세한 내용 및 스펙에 대한 기재사항은 OAuth 2.0의 RFC 문서를 참고해 주십시오.
- [Introspection 스펙](https://www.rfc-editor.org/rfc/rfc7662)과 [Revocation 스펙](https://www.rfc-editor.org/rfc/rfc7009)은 RFC 링크를 참고해 주십시오.

# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. OAuth 2.0의 기본 원리와 도식을 살펴보았습니다.
   1. OAuth 2.0에 사용되는 주요 용어와
1. 어떤식으로 **권한 부여**에 활용되는지 살펴보았습니다.
   1. 권한 부여를 위해, 어떤 설계가 이루어지는지 살펴보았습니다.
   1. 토큰 요청과 응답과 관련한 스펙을 살펴보고, 어떤 식으로 작동하는지 살펴보았습니다.

잘못된 사항은 언제든 댓글로 되짚어주십시오.

읽어주셔서 감사합니다.

---

- References
  - [1] [OAuth 2.0의 RFC 문서입니다](https://datatracker.ietf.org/doc/rfc6749/)
  - [2] [OAuth 2.0의 flow를 확인하며 정말 도움되었던 글입니다](https://developer.okta.com/blog/2017/06/21/what-the-heck-is-oauth)
  - [3] [OAuth 2.0의 Introspection에 대한 해설을 이해하는데 도움되었습니다](https://www.youtube.com/watch?v=nSa0ZCfF2Sc)
  - [4] [Single Sign-on 이해에 상당히 도움되었습니다](https://auth0.com/blog/what-is-and-how-does-single-sign-on-work/)
  - [5] [SSO 구현 모델에 대해 살펴보는데 도움되었습니다](https://wiki.wikisecurity.net/wiki:sso)
  - [6] [OAuth 2.0의 구동 관련 내용을 번역해둔 사항에 대해 참고하였습니다](https://blog.naver.com/mds_datasecurity/222182943542)
