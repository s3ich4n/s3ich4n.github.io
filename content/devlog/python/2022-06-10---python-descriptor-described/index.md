---
title: "Python의 디스크립터에 대해 (1): 이론"
date: "2022-06-10T12:30:00.000Z"
template: "post"
draft: false
slug: "/devlog/python/2022-06-10-python-descriptor-described"
category: "devlog"
tags:
  - "python"
description: "Python의 디스크립터에 대하여 공부한 내용을 정리하고자 글을 작성하였습니다. 2부에서는 실제 오픈소스들의 코드를 보고 해설할 예정입니다."
socialImage: { "publicURL": "./media/sangdo-dong.jpg" }
---

이 문서는 [여기](https://realpython.com/python-descriptors/)와 이펙티브 파이썬 2nd edition의 내용을 발췌하여 요약한 내용이다.

# 목차

- [메소드 내의 python descriptor와 함수](#메소드-내의-python-descriptor와-함수)
- [Attribute이 lookup chain을 통해 access 되는 방식](#attribute이-lookup-chain을-통해-access-되는-방식)
- [파이썬의 디스크립터를 제대로 쓰려면?](#파이썬의-디스크립터를-제대로-쓰려면)
- [디스크립터를 쓰는 이유?](#디스크립터를-쓰는-이유)
- [내 나름의 결론](#내-나름의-결론)

## 메소드 내의 python descriptor와 함수

- python의 메소드란?

  - 메소드는 'object' 인스턴스에 할당한 첫번째 arg를 가진 정규 함수다.
  - 메소드에 `.` notation을 사용하여 접근하면, 다음 작동을 한다

    1. 알맞은 함수를 호출한다
    2. object 인스턴스를 첫번째 파라미터로 전달한다

- `obj.method(*args)`가 `method(obj, *args)`로 호출되는 과정에는 function 오브젝트의 `__get__()` 구현체가 쓰인다.
- 이는 non-data descriptor 라고 부른다(후에 다시 설명될 것임).
- 구체적으로 보면, `function` 오브젝트는 `__get__()` 오브젝트를 구현한다. 이는 `.` notation으로 호출할 때 bound method를 리턴한다.
- 다른 전체 아규먼트 호출을 하기위해 함수 호출에 따라오는 (\*args) 가 필요하다.
- `CPython` 구현체를 python 형태로 풀어내면 다음과 같다:

```python
#
# 참고링크
# https://docs.python.org/3/howto/descriptor.html#functions-and-methods
#

import types

class Function(object):
    ...
    def __get__(self, obj, objtype=None):
        "Simulate func_descr_get() in Objects/funcobject.c"
        if obj is None:
            return self
        return types.MethodType(self, obj)
```

함수가 `.` notation 으로 호출되면 `__get__()` 함수가 호출되고 bound method 가 리턴된다.

이는 일반 인스턴스 메소드 호출에 대해 작동한다. class method나 static method 에 대해서도 마찬가지다.

static method 를 `obj.method(*args)` 형태로 호출할 때, 이는 자동으로 `method(*args)` 형태로 바뀐다. 비슷하게, class method를 `obj.method(type(obj), *args)` 형태로 호출할 때, 이는 자동으로 `method(type(obj), *args)` 형식으로 변경된다.

- `@classmethod` 와 `@staticmethod` 간의 차이를 알기 위해서는 아래 페이지를 참고한다
  [`Python의 @classmethod` 와 `@`staticmethod 에 대하여](https://blog.s3ich4n.me/devlog/python/2022-06-09---python-classmethod-and-staticmethod/)

static method의 cpython 형태를 python 형식으로 바꿔보면 다음과 같다:

```python
class StaticMethod(object):
    "Emulate PyStaticMethod_Type() in Objects/funcobject.c"
    def __init__(self, f):
        self.f = f

    def __get__(self, obj, objtype=None):
        return self.f
```

class method 구현체도 마찬가지:

```python
class ClassMethod(object):
    "Emulate PyClassMethod_Type() in Objects/funcobject.c"
    def __init__(self, f):
        self.f = f

    def __get__(self, obj, klass=None):
        if klass is None:
            klass = type(obj)
        def newfunc(*args):
            return self.f(klass, *args)
        return newfunc
```

파이썬에서는 class method 는 단순히 class reference를 argument list 의 첫번째 argument로 받는 static method 일 뿐이다.

## Attribute이 lookup chain을 통해 access 되는 방식

파이썬의 descriptor와 내부 방식을 알기위해선 attribute에 access할 때 일어나는 일을 알아야 한다.

파이썬에서 모든 객체는 build-in `__dict__` 객체 안에 담겨있다. 이는 객체 자체가 선언한 모든 객체를 담는 딕셔너리다.

```python
class Vehicle():
    can_fly = False
    number_of_weels = 0

class Car(Vehicle):
    number_of_weels = 4

    def __init__(self, color):
        self.color = color

my_car = Car("red")
print(my_car.__dict__)   # 해당 클래스 인스턴스의 __dict__ 값
print(type(my_car).__dict__)    # Car 클래스의 __dict__ 값
```

파이썬에서 모든 값은 '객체' 다. 클래스도 마찬가지로 객체이며, `__dict__` attribute을 가지고있다. 그 값은 모든 attribute과 method 를 가지고 있다.

내부 객체에 실제로 접근할때는 어떤식으로 접근하는걸까? 아래 코드를 예시로 들어보자

```python
# lookup.py
class Vehicle(object):
    can_fly = False
    number_of_wheels = 0

class Car(Vehicle):
    number_of_wheels = 4

    def __init__(self, color):
        self.color = color

my_car = Car("red")

print(my_car.color)
print(my_car.number_of_wheels)
print(my_car.can_fly)
```

결과야 쉽게 알 수 있을 것이다.

내부적으로는 `my_car` 변수의 `color` 를 찾을 때, `my_car` 의 `__dict__` 객체 내부에서 '하나의' 값을 찾는다. `number_of_wheels` 에 접근할 떄는 `Car` 객체의 `__dict__` 에서 찾는 것이다. `can_fly` 값은 `Vehicle` 객체의 `__dict__` 를 찾는 것이다.

그러니까 실제로는 이렇다 이말임

```python
# lookup2.py
class Vehicle():
    can_fly = False
    number_of_weels = 0

class Car(Vehicle):
    number_of_weels = 4

    def __init__(self, color):
        self.color = color

my_car = Car("red")

print(my_car.__dict__['color'])
print(type(my_car).__dict__['number_of_weels'])
print(type(my_car).__base__.__dict__['can_fly'])
```

lookup chain 이 작동하는 방식을 풀면 다음과 같다:

- 찾는 이름의 attribute가 가진 **data descriptor**의 `__get__` 메소드로 결과를 얻는다.
- 그게 잘 안되면, 찾는 이름의 attribute가 가진 object의 `__dict__` 키값으로 값을 구한다.
- 그게 잘 안되면, 찾는 이름의 attribute가 가진 **non data descriptor**의 `__get__` 메소드로 결과를 얻는다.
- 그게 잘 안되면, 찾는 이름의 attribute가 가진 object type의 `__dict__` 키값으로 값을 구한다.
- 그게 잘 안되면, 찾는 이름의 attribute가 가진 object 부모 type의 `__dict__` 키값으로 값을 구한다.
- 그게 잘 안되면, 위의 과정을 모든 부모의 type 에 대해 객체의 [MRO](https://data-flair.training/blogs/python-multiple-inheritance/) 대로 반복한다.
- 그러고도 안되면 `AttributeError` Exception이 발생한다.

## 파이썬의 디스크립터를 제대로 쓰려면?

descriptor 프로토콜(비-데이터 디스크립터)은, 객체 안에 다음 함수를 구현하면 된다:

- `def __get__(self, obj, type=None) -> object`
- `def __set__(self, obj, value) -> None`

디스크립터를 구현할 때, 다음 요소를 잘 기억해두어야 한다:

- `self` 값은 디스크립터 인스턴스이다
- `obj` 값은 디스크립터가 attach 하는 인스턴스이다
- `type` 값은 디스크립터가 atttach 하는 타입이다

`__set__()` 에는 `type` [변수](https://realpython.com/python-variables/)를 가지고 있지 않아도 된다. 왜냐면 객체에서만 `__set__()` 함수를 호출할 수 있기 때문이다. 반면, `__get__()` 함수는 객체와 클래스 모두 호출할 수 있다.

다른 중요한점. 파이썬의 디스크립터는 클래스별로 '딱 한번' 초기화된다는 점이다. 이는, 디스크립터를 포함하는 모든 클래스 인스턴스는 디스크립터 인스턴스를 공유한다는 것이다. 이점은 자칫 잘못하면 아래의 실수를 할 수 있다는 점이다:

```python
# descriptors2.py
class OneDigitNumericValue():
    def __init__(self):
        self.value = 0
    def __get__(self, obj, type=None) -> object:
        return self.value
    def __set__(self, obj, value) -> None:
        if value > 9 or value < 0 or int(value) != value:
            raise AttributeError("The value is invalid")
        self.value = value

class Foo():
    number = OneDigitNumericValue()

my_foo_object = Foo()
my_second_foo_object = Foo()

my_foo_object.number = 3
print(my_foo_object.number)
print(my_second_foo_object.number)

my_third_foo_object = Foo()
print(my_third_foo_object.number)
```

`Foo` 클래스는 number attribute를 가지고있고 이는 디스크립터다. 이 디스크립터는 정수값을 받고, 디스크립터의 속성으로 저장한다.

그런데 뜻대로 되지않을텐데, 이유는 모든 `Foo` 인스턴스가 디스크립터 인스턴스를 공유하기 때문이다.

결국 만든 것은 새로운 클래스 수준의 attribute 일 뿐이다.

`my_foo_object.number` 속성이 설정된 후 마지막 인스턴스가 생성 되었음에도 불구하고 Foo의 모든 인스턴스가 속성 번호에 대해 동일한 값을 가지고 있음을 알 수 있다.

`my_foo_object.number` attribute이 설정된 후 마지막 인스턴스가 생성 되었음에도 불구하고 모든 `Foo` 인스턴스가 동일한 `number` 값이 있음을 볼 수 있다.

연결된 모든 객체에 대한 디스크립터의 모든 값을 저장하기 위해 딕셔너리를 쓰는게 낫겠다 싶다. 거기에다가 `__get__` 해서 값 두고 `__set__` 하면 되겠다 싶은데, 치명적인 단점이 있다.

아래는 그 예시:

```python
# descriptors3.py
class OneDigitNumericValue():
    def __init__(self):
        self.value = {}

    def __get__(self, obj, type=None) -> object:
        try:
            return self.value[obj]
        except:
            return 0

    def __set__(self, obj, value) -> None:
        if value > 9 or value < 0 or int(value) != value:
            raise AttributeError("The value is invalid")
        self.value[obj] = value

class Foo():
    number = OneDigitNumericValue()

my_foo_object = Foo()
my_second_foo_object = Foo()

my_foo_object.number = 3
print(my_foo_object.number)
print(my_second_foo_object.number)

my_third_foo_object = Foo()
print(my_third_foo_object.number)
```

값은 원하는대로 갖고있는데 단점이 있다. 이는, 디스크립터가 오너 오브젝트에 대한 strong reference를 갖고있다는 점이다.

객체를 destroy해도 메모리가 release되지 않는다. 이는 [gc](https://realpython.com/python-memory-management/#garbage-collection)가 객체안의 디스크립터에 대한 객체를 계속 찾기 때문이다.

이러면... weak reference를 하면 되겠다 싶다. 그럴 수도 있지만 모든 값이 weak reference로 참조될 수 있는 것은 아니며, 객체가 (gc에 의해) 수집되면 딕셔너리에서 사라진다는 사실을 처리해야 한다.

괜찮은 해결책은, 디스크립터 자체에 값을 두는게 아니라, 디스크립터가 붙는 **객체**에 저장하면 될 것이다.

```python
# descriptors4.py
class OneDigitNumericValue():
    def __init__(self, name):
        self.name = name

    def __get__(self, obj, type=None) -> object:
        return obj.__dict__.get(self.name) or 0

    def __set__(self, obj, value) -> None:
        obj.__dict__[self.name] = value

class Foo():
    number = OneDigitNumericValue("number")

my_foo_object = Foo()
my_second_foo_object = Foo()

my_foo_object.number = 3
print(my_foo_object.number)
print(my_second_foo_object.number)

my_third_foo_object = Foo()
print(my_third_foo_object.number)
```

다 잘되는데 단점이 있다. 초기화를 할 때 항상 이런식으로 선언을 해줘야 한다는 점이다:

`number = OneDigitNumericValue("number")` ← "number" 라는 값을 기입해줘야 함

파이썬 3.6부터는 `.__set_name__()` 이라는 걸출한게 [PEP 487](https://www.python.org/dev/peps/pep-0487/)에 제안되었고, 정식 기능으로 생겼다.

그 아래에는 메타클래스와 데코레이터로 할 수 있다. (사실 메타클래스는 제대로 쓰기에 너무 복잡해서, 필요하면 다시 공부하도록 하자...)

`__set_name__(self, owner, name)` 을 사용한 예시코드는 아래와 같다:

```python
# descriptors5.py
class OneDigitNumericValue():
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, type=None) -> object:
        return obj.__dict__.get(self.name) or 0

    def __set__(self, obj, value) -> None:
        obj.__dict__[self.name] = value

class Foo():
    number = OneDigitNumericValue()

my_foo_object = Foo()
my_second_foo_object = Foo()

my_foo_object.number = 3
print(my_foo_object.number)
print(my_second_foo_object.number)

my_third_foo_object = Foo()
print(my_third_foo_object.number)
```

예상한대로 잘 됐고, `__init__()` 도 없다.

## 디스크립터를 쓰는 이유?

API 작성같이 고수준의 로직을 풀거나 하는 케이스에서는 디스크립터를 쓸 일이 없다. 일반적인 유스케이스 보다 아래 케이스에서 사용을 고려할 수 있다.

- Lazy properties (for **non-data descriptor**)
  - 이것은 최초로 액세스 하기 전까지에는 initial value가 로드되지 않는다는 것
  - 그 후에는 initial value를 로드하고 나중의 사용을 위해 값이 캐시된다는 것

`DeepThought` 라는 클래스가 `meaning_of_life()` 라는 함수를 갖고있다고 치자. 이 함수는 3초쯤 쉬고 해답을 주는 함수다.

```python
# slow_properties.py
import time

class DeepThought:
    def meaning_of_life(self):
        time.sleep(3)
        return 42

my_deep_thought_instance = DeepThought()
print(my_deep_thought_instance.meaning_of_life())
print(my_deep_thought_instance.meaning_of_life())
print(my_deep_thought_instance.meaning_of_life())
```

셋다 구동하려고 3초씩 매번 쉰다. 해답은 똑같은데 말이지. lazy property는 그 대신 이 메소드의 최초 실행시 연산 후 결과값을 캐싱한다. 디스크립터를 쓰면 이런 해답이 나온다:

```python
# lazy_properties.py
import time

class LazyProperty:
    def __init__(self, function):
        self.function = function
        self.name = function.__name__

    def __get__(self, obj, type=None) -> object:
        obj.__dict__[self.name] = self.function(obj)
        return obj.__dict__[self.name]

class DeepThought:
    @LazyProperty
    def meaning_of_life(self):
        time.sleep(3)
        return 42

my_deep_thought_instance = DeepThought()
print(my_deep_thought_instance.meaning_of_life)
print(my_deep_thought_instance.meaning_of_life)
print(my_deep_thought_instance.meaning_of_life)
```

1. `DeepThought` 를 선언하면서 `@LazyProperty` 를 타고간다.
   1. ~~데코레이터니까~~ non-data 디스크립터를 먼저 선언한다. `__init__` 하면서 function 값을 읽어와서 넣고, name도 마찬가지로 넣는다
      1. function에는 함수의 주소값이 담긴다
      2. name에는 함수의 이름이 담긴다
2. `DeepThought` 를 초기화한다
3. meaning_of_life를 호출하면 `LazyProperty`의 `__get__` 이 실행된다. 디스크립터가 붙는 객체에 함수 이름을 넣는다.
   1. `self.function(obj)` 를 실행하면서 `meaning_of_life` 함수를 구동한다.
      `obj` 값은 `DeepThought` 값이다
      그 결과는 `obj.__dict__[self.name]` 에 담긴다.
   2. 그 결과를 `self.__name__` 에 저장한다.
4. 나머지는 실행할 때마다 동일한 값을 공유한다.
   1. 이 때 파이썬은 `lookup chain` 을 사용하여, `__dict__` 내의 attribute 값을 찾는다.

```python
# wrong_lazy_properties.py
import time

class LazyProperty:
    def __init__(self, function):
        self.function = function
        self.name = function.__name__

    def __get__(self, obj, type=None) -> object:
        obj.__dict__[self.name] = self.function(obj)
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        pass

class DeepThought:
    @LazyProperty
    def meaning_of_life(self):
        time.sleep(3)
        return 42

my_deep_thought_instance = DeepThought()
print(my_deep_thought_instance.meaning_of_life)
print(my_deep_thought_instance.meaning_of_life)
print(my_deep_thought_instance.meaning_of_life)
```

다만 **data descriptor** 에선 작동하지 않는다.

- DRY 한 코드

이런류의 코드에 대해서는 DRY 해진다. 아래는 data descriptor를 안 쓴 예시

```python
# properties.py
class Values:
    def __init__(self):
        self._value1 = 0
        self._value2 = 0
        self._value3 = 0
        self._value4 = 0
        self._value5 = 0

    @property
    def value1(self):
        return self._value1

    @value1.setter
    def value1(self, value):
        self._value1 = value if value % 2 == 0 else 0

    @property
    def value2(self):
        return self._value2

    @value2.setter
    def value2(self, value):
        self._value2 = value if value % 2 == 0 else 0

    @property
    def value3(self):
        return self._value3

    @value3.setter
    def value3(self, value):
        self._value3 = value if value % 2 == 0 else 0

    @property
    def value4(self):
        return self._value4

    @value4.setter
    def value4(self, value):
        self._value4 = value if value % 2 == 0 else 0

    @property
    def value5(self):
        return self._value5

    @value5.setter
    def value5(self, value):
        self._value5 = value if value % 2 == 0 else 0

my_values = Values()
my_values.value1 = 1
my_values.value2 = 4
print(my_values.value1)
print(my_values.value2)
```

이걸 디스크립터로는 다음과 같이 줄일 수 있다:

```python
# properties2.py
class EvenNumber:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, type=None) -> object:
        return obj.__dict__.get(self.name) or 0

    def __set__(self, obj, value) -> None:
        obj.__dict__[self.name] = (value if value % 2 == 0 else 0)

class Values:
    value1 = EvenNumber()
    value2 = EvenNumber()
    value3 = EvenNumber()
    value4 = EvenNumber()
    value5 = EvenNumber()

my_values = Values()
my_values.value1 = 1
my_values.value2 = 4
print(my_values.value1)
print(my_values.value2)
```

## 내 나름의 결론

이거... 제대로 쓰려면 상위 클래스에서 쓰고, 하위 클래스에서는 상속을 받고 써먹어야 하는 것 같다..

코드가 dry 해지고, lazy properties 의 특징을 가지기야 한다만... 필요할 때 제대로 쓰자. 왜냐하면 평소엔 필요없을 것이기 때문이다.

따라서, 좋은 라이브러리의 코드를 이해하고 타고들어갈 때, 혹은 저수준의 라이브러리/파이썬 스러운 인터페이스 설계 시에는 쓸 수 있으니 얼마든지 이런 방향을 알고는 있어야할 것이다.
