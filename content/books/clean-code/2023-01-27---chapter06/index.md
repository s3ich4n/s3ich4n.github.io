---
title: "클린 코드 스터디 (6): 객체와 자료구조"
date: "2023-01-27T23:11:00.000Z"
template: "post"
draft: false
slug: "/books/clean-code/2023-01-27-pt06"
category: "devlog"
tags:
  - "book_review"
  - "code_quality"
description: "2023년 1월부터 시작한 클린 코드 독파 스터디 후, 매 모임 전 준비하는 게시글을 공유합니다. 이 글은 6장, 객체와 자료 구조에 대해 설명합니다."
socialImage: { "publicURL": "./media/water.jpg" }
---

# 6. 객체와 자료 구조

`private` 값으로 쓰기로 한 변수에 대해 `public` 하게 마구잡이로 접근하는 것은, 캡슐화를 무색하게 만듭니다.

## 자료 추상화

### 본문 내용

구현을 외부로 노출하지 않고 철저히 숨깁시다. 인터페이스가 외부에 노출시키는 메소드를 통해 접근하도록 체계를 꾸립시다. 예시를 살펴봅시다.

```java
// 구체적으로 구현된 값입니다. 이를 바로 사용하지 말고...
public class Point {
	public double x;
	public double y;
}

// ... 이런 식의 인터페이스를 상속하여, 구체적으로 구현한 클래스가 상속하게 합시다.
// 극좌표계, 직교좌표계 모두 표현할 수 있도록 매핑되어있군요.
public interface Point {
    double getX();
    double getY();
    void setCartesian(double x, double y);
    double getR();
    double getTheta();
    void setPolar(double r, double theta);
}
```

아래에 구현된 `Point` 인터페이스를 통해 구현하면, 상속받은 구현체는 직교좌표계로도, 극좌표계로도 사용할 수 있습니다. 두 좌표계 모두에 쓰이는 'Point' 로서의 역할에 충실합니다. 유연하게 코드를 풀어낼 수 있지요.

추상 인터페이스를 이용하여 사용자가 구현을 모른 채 자료의 핵심을 조작할 수 있어야 클래스로서의 가치를 합니다. 그저 메소드로 구현한다 하여 생기는 것이 아닙니다. 예시를 살펴봅시다.

```java
// 추상 인터페이스가 갤런단위에 딱 묶여있습니다!
public interface Vehicle {
	double getFuelTankCapacityInGallons();
	double getGallonsOfGasoline();
}

// 이를 풀어내봅시다.
public interface Vehicle {
    double getPercentFuelRemaining();
}
```

### 여기서 잠깐) 파이썬이라면?

언어 자체의 특징을 십분 활용하여 '_하면 안되는 짓을 하지말자_' 형식으로 구현할 수 있을 것입니다. 우선 파이썬에서의 특징 중 일부를 살펴보겠습니다.

- getter, setter를 두지 않고도 **모든 멤버변수에 접근할 수 있습니다**.
  - `__` (밑줄 두개, double under)를 두면 `private` 처리를 하는 것이 아니라, 다른 이름으로 처리됩니다([참고링크](https://peps.python.org/pep-0008/#method-names-and-instance-variables)).
- dynamic typing 입니다. 타입에 대한 제한은 '쓰기 나름' 으로 두고, 타입 힌팅을 명확히 하여 제공하는 편이 좋겠습니다.

이런 특징을 토대로 getter, setter를 파이썬스럽게 구현하는 방안은 여러가지가 있습니다. 관심있으시다면, [참고링크](https://realpython.com/python-getter-setter/)를 통해 보다 상세한 구현에 대해 확인해보시길 바랍니다.

1. 상속을 이용해, 전통적인 getter, setter를 두고 파이썬에서 원래 가능하던 멤버변수 접근에 대해 `Exception`을 발생시킵니다.
2. `@property` , `@x.setter` 데코레이터 활용 → 커스텀 로직을 넣고 클래스 내부의 값을 사용하여 보다 적극적으로 로직을 풀어낼 수 있습니다
3. 디스크립터 활용 → 2에서 반복되는 로직을 빼고 별도의 객체를 만듭니다. 이를 다른 클래스에서 사용하도록 합니다.

## 자료/객체 비대칭

절차적 접근을 통한 코드와 객체적 접근을 통한 코드의 지향성을 살펴보고, 때에 따라 필요한 점을 잘 선택해야 함을 살펴봅시다.

### 절차적 접근법

각 도형들은 자료구조로서의 역할에 충실합니다. 동작 방식은 Geometry 클래스에서 구현합니다.

```java
public class Square {
    public Point topLeft;
    public double side;
}

public class Rectangle {
    public Point topLeft;
    public double height;
    public double width;
}

public class Circle {
    public Point center;
    public double radius;
}

public class Geometry {
    public final double PI = 3.141592;

    public double area(Object shape) throws NoSuchShapeException {
        if (shape instanceof Square) {
            Square s = (Square)shape;
            return s.side * s.side;
        }
        else if (shape instance of Rectangle) {
            Rectangle r = (Rectangle)shape;
            return r.height * r.width;
        }
        else if (shape instance of Circle) {
            Circle c = (Circle)shape;
            return PI * c.radius * c.radius;
        }
        throw new NoSuchShapeException();
    }
}
```

만일 둘레를 구하는 등, **새로운 기능**을 추가하거나 **새로운 도형**을 추가하려면 Geometry에 속한 클래스를 **모두** 고쳐야합니다.

반면 객체지향적 접근법이라면 새 함수를 추가하고 싶을 때 도형 클래스 전부를 고쳐야합니다[1].

```java
public class Square implements Shape {
    private Point topLeft;
    private double side;

    public double area() {
        return side * side;
    }
}

public class Rectangle implements Shape {
    private Point topLeft;
    private double height;
    private double width;

    public double area() {
        return height * width;
    }
}

public class Circle implements Shape {
    private Point center;
    private double radius;
    public final double PI = 3.141592;

    public double area() {
        return PI * radius * radius;
    }
}
```

둘은 상호보완적입니다. 장단점을 비교해봅시다.

- 자료구조에 대한 관점에서 보았을 때
  - 절차적 코드
    - 기존 자료구조를 변경하지 않으면서 새 함수를 추가하기 쉽습니다.
    - 새로운 함수를 추가하기 어렵습니다. 그러려면 모든 클래스를 고쳐야 합니다.
  - 객체 지향 코드
    - 기존 함수를 변경하지 않으면서 새 클래스를 추가하기 쉽습니다
    - 새로운 자료구조를 추가하기 어렵습니다. 그러려면 모든 함수를 고쳐야 합니다.

살펴보았듯 아래와같이 요약할 수 있습니다.

- 객체 지향 코드에서 어려운 변경은 절차적인 코드에서 쉬우며, 절차적인 코드에서 어려운 변경은 객체 지향 코드에서 쉽습니다.
- 새로운 자료 타입이 필요한 경우에는 클래스와 객체 지향 기법이 적합합니다. 반면 새로운 함수가 필요한 경우라면 절차적 코드와 자료구조가 좀 더 적합합니다.

때에 따라 잘 풀어나갑시다. 언어가 지향하는 바를 계속 공부해보고 이를 적용하는 식으로 짜면 되지 않을까 합니다. 멀티 패러다임 언어가 나타나는 이유는, 이러한 바를 토대로 필요한 패러다임을 쓰라는 배려가 아닐까 합니다.

## 디미터 법칙

디미터 법칙(Law of Demeter)은 실용주의 프로그래머에서 소개된 하나의 지침이자 휴리스틱입니다. 모듈은 자신이 조작하는 객체의 속사정을 몰라야 한다 라는 내용을 가지고 있습니다. 객체는 자료를 숨기고 함수를 공개하지요. 그렇지 않다는 것은 내부 구조가 드러난다는 뜻입니다.

디미터 법칙은 "클래스 C의 메소드 f는 다음과 같은 객체의 메소드만 호출하라" 라는 뜻입니다.

- 클래스 C
- f 가 생성한 객체
- f 인수로 넘어온 객체
- C 인스턴스 변수에 저장된 객체

위 객체에서 허용된 메소드가 반환하는 객체의 메소드는 호출하면 안 됩니다. 이런식의 코드가, 저자의 관점에서 좋지 못한 예시가 되겠습니다.

`final string outputDir = ctxt.getOptions().getScratchDir().getAbsolutePath();`

이런 코드를 기차 충돌(train wrack)이라고 부른다고 합니다. 아래와 같은 방향으로 나누는 편을 권장합니다.

```java
Options opts = ctxt.getOptions();
File scratchDir = opts.getScratchDir();
final String outputDir = scratchDir.getAbsolutePath();
```

타고 들어가며 얻는 자료구조가 많군요. 이 코드를 쓰는 함수는 많은 객체를 탐색할 줄 안다는 말입니다. 디미터 법칙을 위반하는지 살펴보려면 `ctxt`, `Options`, `ScratchDir`이 객체인지 자료구조인지에 따라 달려있습니다. 객체라면 숨기고, 자료구조라면 내어놓는 편이 좋으니까요.

### 잡종 구조

이렇게 섞이면 절차적, 객체지향적 개념이 모두 들어가게되고 성급하게 설계하면 둘의 장점만을 취하는 최악의 경우가 생길 것입니다. 이런 구조는 되도록이면 피하는 것이 좋습니다.

### 구조체 감추기

위의 예시 코드를 조금 살펴보면 객체에게 뭔가 하라고 메시지를 주는 편이 좋겠습니다. 맥락을 살펴보니 같은 모듈에서 이 코드를 사용하는 이유가, 추상화 수준을 섞어놓은것이 그 이유였습니다. 그렇다면 적절한 객체에게 작업을 위임하는 것은 어떨까요? 내부구조를 드러내지 않고, 동시에 자신이 몰라도 되는 값이 알아서 처리하게 해주면 될 것입니다.

## 자료 전달 객체

위에서 살펴본 자료 구조체는 DTO(Data Transfer Object) 라고도 부르기도 합니다. DB와 통신하거나 소켓에서 받은 메시지의 구문을 분석할 때 유용합니다. 흔히 DB에 저장된 가공되지 않은 정보를 앱 단에서 사용할 객체로 변환할 때 맨 먼저 사용합니다.

### 활성 레코드

DTO의 특수한 경우입니다. save(), find() 까지 함께 제공합니다. 이 활성 레코드는 DB 테이블이나 다른 소스에서 자료를 직접 변환합니다. 이는 자료구조로 취급하는 것이 마땅합니다. 비즈니스 규칙을 담으면서 내부자료를 숨기는 객체를 따로 생성할 필요가 있습니다.

## 결론

객체는 동작을 공개하고 자료를 숨깁니다. 그래서 기존 동작을 변경하지 않으면서 새 객체 타입을 추가하기 쉽습니다. 하지만 기존 객체에 새 동작을 추가하기는 어렵습니다.

자료 구조는 별 동작 없이 자료를 노출합니다. 그래서 기존 자료 구조에서 새 동작을 추가하기는 쉽습니다. 하지만 기존 함수에 새 자료 구조를 추가하기는 어렵습니다.

따라서 어떤 시스템을 구현할 때, 새로운 자료 타입을 추가하는 유연성이 필요하다면 객체가 더 적합합니다. 그렇지만 새로운 동작을 추가하는 유연성이 필요하면 자료구조와 절차적 코드가 더 적합합니다.

---

References

- [1]: [VISITOR 패턴](https://en.wikipedia.org/wiki/Visitor_pattern)을 활용하여 풀어낼 수도 있지만, 이런 기법 또한 내부 구조가 VISITOR에 열리게됩니다. 캡슐화 위반이지요. 그리고 상기 살펴본 절차적 프로그램에서 볼 수 있는 구조가 반환됩니다.
