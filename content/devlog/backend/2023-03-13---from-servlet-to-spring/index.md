---
title: "서블릿부터 스프링 프레임워크까지"
date: "2021-09-18T19:00:00.000Z"
template: "post"
draft: false
slug: "/devlog/docker/2021-09-18-how-to-make-docker-image-securely"
category: "devlog"
tags:
  - "web"
  - "backend"
  - "java"
description: "PEP 333을 보고, 자바 진영의 서블릿과 웹 프레임워크의 금자탑인 스프링 프레임워크 까지 함께 알아보게 되었습니다."
socialImage: { "publicURL": "./media/spring.jpg" }
---

Servlet? JSP? JavaBeans? 평소 헷갈렸던 개념들을 쭉 나열하고 하나씩 이해해 보았습니다. 나아가 이를 통해 스프링 프레임워크가 얼마나 큰 개념들을 함께 내포하고 있는지도 간략히 살펴보았습니다.

자바 웹 애플리케이션을 이해하기 위한 개념들에 대해 알아봅시다.

# 서블릿?

Java Servlet은 Java를 이용하여 웹 어플리케이션을 작성할 수 있는 인터페이스(API)를 제공합니다. Java Servlet API를 이용하면 웹 클라이언트의 요청과 응답을 처리하고, 데이터베이스 연결, 파일 업로드, 보안 인증 등 다양한 웹 개발에 필요한 기능을 구현할 수 있습니다.

`javax.servlet`, `javax.servlet.http` 패키지안에 서블릿 작성을 위한 인터페이스와 클래스가 있습니다. 아래의 “서블릿 구성요소”에서 후술합니다. 특히 `HttpServlet` 클래스는 HTTP 관련 서비스를 처리하기 위해 `doGet` 및 `doPost`와 같은 메서드를 제공합니다.

JSP는 Java Servlet 기술을 확장하여, HTML 문서 안에 Java 코드를 삽입할 수 있도록 해줍니다. 이렇게 함으로써, 웹 개발자는 더욱 쉽게 동적인 웹 페이지를 생성하고, 데이터베이스와의 상호작용 등을 수행할 수 있습니다.

Spring Framework는 Java Servlet API를 기반으로 하며, 의존성 주입, AOP(Aspect-Oriented Programming), MVC(Model-View-Controller) 패턴, 데이터 액세스, 보안 등 다양한 기능을 제공합니다. Spring Framework를 사용하면 Java 기반의 웹 어플리케이션을 더욱 빠르고 효율적으로 개발할 수 있습니다.

따라서, JSP와 Spring Framework는 Java Servlet을 기반으로 하고 있으며, 이를 이용하여 웹 개발을 보다 쉽게하고, 효율적으로 할 수 있도록 도와줍니다.

## 서블릿 구성요소

서블릿의 기본 구성 요소는 다음과 같습니다. 논의하면서 주로 HTTP 서블릿에 대해 이야기할 것입니다.

1. Servlet Interface: 서블릿 인터페이스는 `javax.servlet` 패키지에 정의되어 있으며, 서블릿 클래스가 구현해야 하는 메서드를 정의합니다. 서블릿 클래스는 반드시 이 인터페이스를 구현해야 합니다.
2. Servlet Container: 서블릿 컨테이너는 웹 어플리케이션 서버의 일부로, [서블릿의 생명 주기(lifecycle)](https://docs.oracle.com/javaee/5/tutorial/doc/bnafi.html)를 관리하고 HTTP 요청 및 응답을 처리합니다. Tomcat, Jetty, GlassFish 등의 서버가 서블릿 컨테이너의 역할을 수행합니다.
   1. 생명주기를 간략히 설명하면 아래와 같습니다.
      1. 서블릿의 인스턴스가 존재하지 않는 경우 웹 컨테이너는...
         1. 서블릿 클래스를 로드합니다.
         2. 서블릿 클래스의 인스턴스를 만듭니다.
         3. `init` 메소드를 호출하여 서블릿 인스턴스를 초기화합니다. 초기화는 서블릿 초기화에서 다룹니다.
      2. 요청 및 응답 개체를 전달하여 서비스 메서드를 호출합니다. 서비스 메서드는 서비스 메서드 작성에서 설명합니다.
      3. 컨테이너가 서블릿을 제거해야 하는 경우 서블릿의 `destroy` 메소드를 호출하여 서블릿을 종료합니다. 종료는 서블릿 종료에서 설명합니다.
   2. 톰캣이 상기 내용을 토대로 구현되어있겠죠.
3. Servlet Request: 클라이언트로부터 전송된 HTTP 요청을 나타냅니다. `ServletRequest` 인터페이스는 HTTP 요청에 대한 다양한 메타데이터(메서드, URI, 헤더, 쿠키 등)를 포함합니다.
   1. [해당 대목](https://docs.oracle.com/javaee/5/tutorial/doc/bnafv.html#bnafw)을 중점으로 살펴보시면 이해하기 쉽습니다.
4. Servlet Response: 클라이언트로 전송할 HTTP 응답을 나타냅니다. `ServletResponse` 인터페이스는 HTTP 응답에 대한 다양한 메타데이터(상태 코드, 헤더 등)를 포함합니다.
   1. [해당 대목](https://docs.oracle.com/javaee/5/tutorial/doc/bnafv.html#bnafz)을 중점으로 살펴보시면 이해하기 쉽습니다.
5. Servlet Config: 서블릿 설정 정보를 나타냅니다. `ServletConfig` 인터페이스는 서블릿 초기화 파라미터와 서블릿 이름을 포함합니다.
6. Servlet Context: 웹 어플리케이션의 전역 정보를 나타냅니다. `ServletContext` 인터페이스는 웹 어플리케이션의 루트 디렉토리 경로, 서블릿 컨텍스트 초기화 파라미터 등의 정보를 포함합니다.
   1. 서블릿 컨텍스트는 [이 링크](https://docs.oracle.com/javaee/5/tutorial/doc/bnagl.html)를 참조하십시오.

> 참고: 그 외에 세션 유지 및 Finalize 관련 요소에 대한 설명은 생략합니다.

이러한 서블릿의 기본 구성 요소를 활용하여 웹 어플리케이션을 구현할 수 있습니다. 서블릿은 또한 자바 EE(Java Enterprise Edition) 표준 기술의 일부이며, 다양한 웹 개발 프레임워크와 라이브러리를 포함하여 대규모 웹 어플리케이션을 개발하는 데 필수적인 기술입니다.

# JSP?

JavaServer Pages (JSP)는. 서블릿 기술을 확장하여 웹 어플리케이션 개발을 보다 쉽게 할 수 있도록 해주는 기술입니다. JSP는 HTML 코드와 자바 코드를 혼합하여 웹 페이지를 생성할 수 있도록 합니다.

## JSP 구성요소

JSP의 핵심 요소는 다음과 같습니다.

1. `Scriptlets`: `<% %>` 태그 내에 자바 코드를 작성하는 것으로, JSP 페이지를 생성하는 데 필요한 로직을 처리할 수 있습니다.
2. Declarations: `<%! %>` 태그 내에 전역 변수 및 메서드를 선언하는 것으로, JSP 페이지 내에서 재사용 가능한 코드를 작성할 수 있습니다.
3. Directives: `<%@ %>` 태그 내에 JSP 페이지의 속성을 설정하는 것으로, import 문, 에러 페이지 지정, 캐시 설정 등을 할 수 있습니다.
4. Expressions: `<%= %>` 태그 내에 자바 표현식을 작성하는 것으로, JSP 페이지에서 계산된 값을 출력할 수 있습니다.
5. Actions: `jsp:*` 태그로 표시되며, JSP 컨테이너에서 실행되는 특수 태그로, JavaBean 객체의 값을 출력하거나, 페이지 이동 및 조건 분기 등의 로직을 처리할 수 있습니다.

## JSP 대신..?

AFAIK, 요즘은 JSP를 쓰기보단 아래 조합들이 더 쓰인다고 하더군요.

1. Spring Boot + Thymeleaf

   - Spring Boot는 웹 어플리케이션을 빠르게 개발할 수 있게 해주는 프레임워크이며, Thymeleaf는 템플릿 엔진 중 하나입니다. Spring Boot에서 Thymeleaf를 사용하면 서블릿을 이용하여 웹 어플리케이션을 개발할 수 있습니다. Thymeleaf는 JSP보다 유연한 문법을 제공하며, 자바 코드를 사용하지 않아도 HTML과 연동하기 쉽습니다.

1. Spring Boot + Freemarker

   - Spring Boot에서 Freemarker를 사용하면 서블릿을 이용하여 웹 어플리케이션을 개발할 수 있습니다. Freemarker는 Thymeleaf와 유사한 템플릿 엔진으로, JSP보다 유연한 문법을 제공합니다. 또한, 자바 코드를 사용하지 않아도 HTML과 연동하기 쉽습니다.

1. Spring Boot + Mustache
   - Spring Boot에서 Mustache를 사용하면 서블릿을 이용하여 웹 어플리케이션을 개발할 수 있습니다. Mustache는 JSP나 Thymeleaf보다 문법이 단순하며, 자바 코드를 사용하지 않아도 HTML과 연동하기 쉽습니다. 또한, Mustache는 서버와 클라이언트 간의 데이터 교환을 쉽게 할 수 있도록 지원합니다.

# Java Beans?

JavaBeans 구성 요소는 쉽게 재사용하고 응용 프로그램으로 함께 구성할 수 있는 Java 클래스입니다. 특정 디자인 규칙을 따르는 모든 Java 클래스는 JavaBeans 구성 요소입니다.

JavaBeans 클래스는 다음과 같은 규칙을 따릅니다.

1. 클래스는 파라미터가 없는 생성자를 제공해야 합니다.
2. 클래스의 속성은 private으로 선언되어야 하며, getter/setter 메서드를 제공해야 합니다.
3. getter/setter 메서드는 public으로 선언되어야 하며, 메서드 이름은 get/set으로 시작해야 합니다.
4. 속성 이름은 get/set 메서드 이름에서 get/set 접두사를 제외한 나머지 부분이 됩니다. 예를 들어, `getName()/setName()` 메서드가 있다면 속성 이름은 name이 됩니다.
5. 클래스는 `Serializable` 인터페이스를 구현해야 합니다.

JavaBeans는 재사용성이 높은 컴포넌트를 개발할 때 유용합니다. 예를 들어, 데이터베이스에서 데이터를 가져와 웹 페이지에 표시하는데 사용될 수 있는 데이터 모델 클래스를 개발할 때 JavaBeans 규약을 따르면, 이를 JSP나 서블릿과 쉽게 연동할 수 있습니다.

> 주 - 웹 응용 프로그램에서 사용할 때 MVC 아키텍처는 종종 모델-2 아키텍처라고 합니다. 프레젠테이션과 비즈니스 로직을 혼합하는 4장, Java Servlet 기술에서 논의된 서점의 예는 모델-1 아키텍처로 알려진 것을 따릅니다. Model-2 아키텍처는 웹 애플리케이션 설계에 권장되는 접근 방식입니다.
>
> [출처](https://docs.oracle.com/javaee/5/tutorial/doc/bnahb.html)

# Java Beans와 Spring Framework의 관계

Spring Framework에서는 JavaBeans를 매우 활발하게 사용합니다. Spring Framework에서는 자바 객체를 컨테이너에서 관리하기 위해 JavaBeans 규약을 따르는 POJO(Plain Old Java Object) 클래스를 사용합니다.

Spring Framework에서는 POJO 클래스를 컨테이너에 등록하고, 필요한 객체를 DI(Dependency Injection)를 통해 주입하여 사용합니다. DI는 객체 간의 의존성을 줄이기 위해 사용되며, 객체를 생성하고 관리하는 작업을 프레임워크가 대신 처리합니다.

Spring Framework에서는 POJO 클래스가 JavaBeans 규약을 따르면, 컨테이너에서 해당 클래스의 객체를 생성하고 DI를 적용할 수 있습니다. 따라서, Spring Framework에서는 POJO 클래스의 멤버 변수를 private으로 선언하고, getter/setter 메서드를 제공하여 JavaBeans 규약을 따르도록 작성합니다.

예를 들어, 다음은 Spring Framework에서 사용할 수 있는 간단한 POJO 클래스입니다.

```java
public class User {
    private String name;
    private int age;

    public User() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }
}

```

위의 코드에서는 JavaBeans 규약을 따르기 위해 속성을 private으로 선언하고, getter/setter 메서드를 제공합니다.

Spring Framework에서는 이 POJO 클래스를 다음과 같이 등록하고 DI를 적용할 수 있습니다.

```java
@Configuration
public class AppConfig {
    @Bean
    public User user() {
        User user = new User();
        user.setName("John");
        user.setAge(30);
        return user;
    }
}

@Service
public class UserService {
    @Autowired
    private User user;

    public void printUser() {
        System.out.println(user.getName() + ", " + user.getAge());
    }
}

```

위의 코드에서는 `AppConfig` 클래스에서 User 객체를 Bean으로 등록하고, `UserService` 클래스에서 `Autowired` 어노테이션을 사용하여 User 객체를 DI 받습니다. 이렇게 등록된 User 객체는 `UserService` 클래스에서 사용되어 출력됩니다.

따라서, Spring Framework에서는 JavaBeans 규약을 따르는 POJO 클래스를 사용하여 객체를 생성하고 DI를 적용하므로, 객체 간의 의존성을 줄이고 코드의 재사용성을 높일 수 있습니다.

# Spring Framework의 핵심 요소?

사실상 스프링 프레임워크를 간략하게 이해하기 위해 여기까지 왔습니다.

그래서, 스프링 프레임워크의 런타임으로 정말 핵심적인 컴포넌트들을 소개하면 아래 요소들이 나오는 것이었습니다.

- Spring Core container
  - 스프링 프레임워크의 기본
  - 스프링 DI의 근간
- AOP
  - AOP 지원. 이는 추후 다른 게시글로 소개하겠습니다.
- 데이터 접근/통합 레이어
  - ORM, DAO 등이 속합니다
- 웹 레이어
  - HTTP 뿐 아니라 웹소켓 등이 속합니다
- 테스팅 레이어
  - [해당 링크](https://docs.spring.io/spring-framework/docs/current/reference/html/testing.html)를 참고하여 주십시오.

![도식은 이렇습니다.](https://docs.spring.io/spring-framework/docs/4.3.x/spring-framework-reference/html/images/spring-overview.png)

# 마무리

이상으로 헷갈렸던 개념들을 모두 정리할 수 있었습니다. 글을 한번 되짚어봅시다.

1. Servlet은 웹 앱을 작성하기 위한 기본 뼈대입니다.
1. JSP는 HTML 코드와 자바 코드를 혼합하여 웹 페이지를 생성하는 기술입니다. 하지만 확장성이나 코드의 유연함에서 좀 아쉬운 면이 있지요.
1. JavaBeans는 재사용성을 중시하고 데이터를 자바스럽게 표현하는 기술입니다. 그 나름의 프로토콜을 가지고 있으며, 이는 Spring Framework에도 활발하게 쓰입니다.
1. Spring Framework가 얼마나 많은 연구들의 총집이자 금자탑인지 알게되었습니다.

긴 글 읽어주셔서 감사합니다.

---

참고문서

- [Java EE 5 튜토리얼](https://docs.oracle.com/javaee/5/tutorial/doc/docinfo.html) (사실 이 속에 정답이 거의 들어있었습니다!)
- [Configuration annotation을 통한 Spring Bean 설정](https://johngrib.github.io/wiki/spring-bean-config-configuration/)
- [Spring `@Configuration` Annotation](https://www.digitalocean.com/community/tutorials/spring-configuration-annotation)
