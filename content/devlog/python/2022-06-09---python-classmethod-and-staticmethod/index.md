---
title: '"@classmethod" 와 "@staticmethod"에 대해'
date: "2022-06-09T10:30:00.000Z"
template: "post"
draft: false
slug: "/devlog/python/2022-06-09-python-classmethod-and-staticmethod"
categories: "devlog"
tags:
  - "python"
description: 'Python의 "@classmethod" 와 "@staticmethod"에 대해'
socialImage: "./media/sangdo-dong.jpg"
---

본 페이지에서는 Python의 `@classmethod`, `@staticmethod` 에 대한 차이와 실제 예시를 통해 어떤식의 차이가 있는지 기술한다.

## `@classmethod` 란?

- 클래스에 바인딩된 메소드를 의미한다.
- `self` 대신, `cls` 변수를 메소드 앞에 추가한다.
- `@classmethod` 를 상속받은 자식 클래스에서는, 자식 클래스의 property 를 가리킨다.

## `@staticmethod` 란?

- 정적 메소드 개체는 일반적으로 사용자 정의 메소드 개체와 같은 다른 개체를 감싸는 래퍼다.
- 정적 메소드 개체가 클래스 또는 클래스 인스턴스에서 검색될 때 실제로 반환된 개체는 더 이상 변형되지 않는 래핑된 개체이다.
- 정적 메소드 개체는 일반적으로 래핑하는 개체가 있지만 자체적으로 호출할 수 없다.
- 특정 객체 내에서, 로직으로 연결된 처리를 위해 작성하는 메소드를 의미한다.

## 실제 예시

### `@classmethod` 예시

- 공통적으로 상속받은 클래스들이 자신의 객체정보를 연산하기 위하여 처리한 예시값이다.

```python
class TypeBase(BaseModel):
    """ TypeBase는 모든 이벤트 클래스가 상속하는 클래스
    Pydantic을 통해, 필요 기능들을 사용할 수 있도록 작업하였다.
    """

    def __init__(self, **data):
        super().__init__(**data)

    # (중략)

    @classmethod
    def get_types(cls):
        """ 이벤트 클래스의 모든 필드에 대해 {변수명: 타입} 으로 리턴한다.
        """
        return {
            field.name: field.type_ for field in cls.__fields__.values()
        }

    @classmethod
    def get_searchables(cls):
        """ 검색 가능한 필드에 대해 {변수명: 타입} 으로 리턴한다.
        """
        return {
            idx.name: idx.type_ for idx in
            (field for field in cls.__fields__.values() if
              field.name in cls.Config.searchables)
        }

    @classmethod
    def get_result_fields(cls):
        """ 리턴값으로 제공가능한 필드에 대해 {변수명: 타입} 으로 리턴한다.
        """
        return {
            idx.name: idx.type_ for idx in
            (field for field in cls.__fields__.values() if
              field.name in cls.Config.results)
        }
```

- 이런 식으로, `TypeBase` 클래스를 상속받는 하위 객체에서 다음과 같이 사용할 수 있다.
  1. 상속받는 하위 객체에서, 메타클래스로 `searchables`, `results` 라는 필드값을 지정한다.
  2. 해당 값에 대한 dictionary comprehension을 사용하여, `{변수명:타입}` 형식을 제공할 수 있게 된다.

### `@staticmethod` 예시

- 특정 메소드의 연산 등, 필요한 값들에 대해 바로 연산하는 용도로 사용할 수 있다.

  - ```python
        @staticmethod
        def parse_bool_envbars(value: (str, int))->bool:
            if value in ('true', 'True', '1', 1):
                return True
            return False

        @staticmethod
        def parse_list_envbars(value: (list, str))->list:
            if type(value) == list:
                return value
            else:
                return value.split(',')
    ```

  - 이런 식으로, 특정 메소드 내의 일부 값을 받은 후 즉시 필요한 값을 전달하는 용도로 사용한다.
