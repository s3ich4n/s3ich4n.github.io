---
layout: post
title: "Today I Learned: 10th Apr, 2019"
categories: til
tags: [TIL, Django]
---

# Django에서 GraphQL을 써봅시다.

## What is GraphQL?

*language-independent query language* 이다. 무슨 언어, 무슨 DB든 간에 의미한 쿼리를 하도록 하는 것이 목적.

우선 이 [링크](https://graphql.github.io/)를 보고 옵시다

REST는 CRUD 엔드포인트를 노출시킨다.

REST는 많은 경우에서 제대로 잘 쓸 수 있다. 근데 시간이 흐르면서 엔드포인트가 늘어난다. 이는 API관리가 빡세게 되는 원인이다. REST API에서 필요한 데이터를 검색하는 방법에 따라 둘 이상의 요청이 필요할 수도 있고 필요 이상으로 많은 데이터를 가져올 수도 있다. 이는 오버 페칭(over fetching) 또는 언더 페칭(fetching) 이라고도 부른다.

Depending on how it's structed retrieving the data you need from your REST API could take more than one request or you even fetch more data than you need. that's also known as over fetching or under fetching.

GraphQL은 하나의 엔드포인드만 노출시킨다. 예를들어 GET 리퀘스트를 엔드포인트에 보낼 때, 무슨 데이터를 fetch할 것인지 명확히 알 수 있습니다. fetch하려는 데이터 쿼리 맨 위에는 [Mutations](https://graphql.github.io/learn/queries/#mutations)을 사용해서 update, delete, create를 로 데이터를 조작할 수 있습니다.

GraphQL은 SQL을 대체하는 것이 아니라 REST API를 대체하는 개념이다. 쿼리를 짜준다 생각하면 됨. 조건을 게재하는건 파라미터 하나 두고 작업

보다 자세한 의견은 이 링크도 참조할 것. [My GraphQL Thoughts After Almost Two Years](https://apievangelist.com/2018/04/16/graphql-thoughts-after-almost-two-years/)

## Graphene 설치과정

모든 프로젝트는 virtualenv로 스타트하자!

```
# 둘 중 하나를 선택
$ virtualenv --python=$(which python) venv
$ virtualenv -p $(which python) venv

(venv) $ pip install graphene
```

`schema.py`를 만들고 다음과같이 테스트해보자.

```python
import graphene
import json

class Query(graphene.ObjectType):
    is_staff = graphene.Boolean()

    def resolve_is_staff(self, info):
        return True

schema = graphene.Schema(query=Query)

result = schema.execute(
    '''
    {
        isStaff
    }
    '''
)

items = dict(result.data.items())
print(json.dumps(items, indent=4))
print(result.data.items())
```

```
$ python schema.py
{
    "isStaff": true
}
odict_items([('isStaff', True)])
```

`isStaff`를 `snake_case`로 쓰고싶다면?

1. `graphene.Schema(query=Query, auto_camelcase=False)`
2. `graphene.Boolean(name='is_staff')`로 명시화


## 본격적인 예시

유저의 정보를 담는 `User` 클래스를 만들고 작업해보자. 소스코드는 아래와 같다.

```python
from datetime import datetime
import graphene
import json


class User(graphene.ObjectType):
    id = graphene.ID() # id field
    username = graphene.String()
    last_login = graphene.DateTime()


class Query(graphene.ObjectType):
    users = graphene.List(User)

    is_staff = graphene.Boolean()

    def resolve_users(self, info):
        return [
            User(username='Alice', last_login=datetime.now()),
            User(username='Bob', last_login=datetime.now()),
            User(username='Charlie', last_login=datetime.now()),
        ]

schema = graphene.Schema(query=Query, auto_camelcase=False)

result = schema.execute(
    '''
    {
        users {
            username
            last_login
        }
    }
    '''
)

items = dict(result.data.items())
print(json.dumps(items, indent=4))
```

## Mutations를 통한 쿼리수행 예시

```python
from datetime import datetime
import graphene
import json


class User(graphene.ObjectType):
    id = graphene.ID() # id field
    username = graphene.String()
    last_login = graphene.DateTime(required=False)


class CreateUser(graphene.Mutation):
    
    class Arguments:
        username = graphene.String()

    user = graphene.Field(User)

    def mutate(self, info, username):
        user = User(username=username)
        return CreateUser(user=user)



class Mutations(graphene.ObjectType):
    create_user = CreateUser.Field()


class Query(graphene.ObjectType):
    users = graphene.List(User, first=graphene.Int())

    is_staff = graphene.Boolean()

    def resolve_users(self, info, first):
        return [
            User(username='Alice', last_login=datetime.now()),
            User(username='Bob', last_login=datetime.now()),
            User(username='Charlie', last_login=datetime.now()),
        ][:first]

schema = graphene.Schema(
    query=Query,
    mutation=Mutations,
    auto_camelcase=False,
)

result = schema.execute(
    '''
    mutation create_user($username: String) {
        create_user(username: $username) {
            user {
                username
            }
        }
    }
    ''',
    variable_values={'username': 'Charlie'}
)

items = dict(result.data.items())
print(json.dumps(items, indent=4))
```

## context를 넣고 사용하는 방법

```python
from datetime import datetime
import graphene
import json


class User(graphene.ObjectType):
    id = graphene.ID() # id field
    username = graphene.String()
    last_login = graphene.DateTime(required=False)


class CreateUser(graphene.Mutation):
    
    class Arguments:
        username = graphene.String()

    user = graphene.Field(User)

    def mutate(self, info, username):
        if info.context.get('is_vip'):
            username = username.upper()
            
        user = User(username=username)
        return CreateUser(user=user)



class Mutations(graphene.ObjectType):
    create_user = CreateUser.Field()


class Query(graphene.ObjectType):
    users = graphene.List(User, first=graphene.Int())

    is_staff = graphene.Boolean()

    def resolve_users(self, info, first):
        return [
            User(username='Alice', last_login=datetime.now()),
            User(username='Bob', last_login=datetime.now()),
            User(username='Charlie', last_login=datetime.now()),
        ][:first]

schema = graphene.Schema(
    query=Query,
    mutation=Mutations,
    auto_camelcase=False,
)

result = schema.execute(
    '''
    mutation create_user($username: String) {
        create_user(username: $username) {
            user {
                username
            }
        }
    }
    ''',
    variable_values={'username': 'Charlie'},
    context={'is_vip': True},
)

items = dict(result.data.items())
print(json.dumps(items, indent=4))

```

## 쟝고에선 어떻게 쓰나?

GraphiQL 주소 세팅
schema.py에 쿼리 세팅

그후 쿼리 조립해서 graphql 제공하는 API 엔드포인트 제공

## 추후 연재될 요소

`Relay`와 `GraphQL`을 함께 써봅시다!

언제하냐구요? 최대한 빨리 해보겠습니다..
