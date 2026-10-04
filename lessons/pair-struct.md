# pair, struct і власне сортування

Часто дані йдуть «пакетами»: точка — це дві координати, учень — ім’я і бал, відрізок — початок і кінець. Тримати такі дані в окремих масивах незручно: під час сортування одного масиву інші «роз’їдуться». У C++ для цього є `pair` і `struct`, а сортувати їх можна за будь-яким правилом.

> [!NOTE] У цьому уроці
> - пара значень `pair` і як сортуються пари;
> - власні типи даних `struct`;
> - сортування за власним правилом (компаратор);
> - як зберегти початкові номери елементів при сортуванні.

## `pair` — пара значень

`pair<A, B>` зберігає два значення, можливо різних типів. Вони доступні як `first` і `second`:

```cpp
#include <iostream>
#include <utility>
#include <string>
using namespace std;

int main() {
    pair<int, int> point = {3, 5};
    pair<string, int> student = {"Ivan", 11};
    cout << point.first << " " << point.second << "\n";
    cout << student.first << " " << student.second << "\n";
    point.first = 10;
    cout << point.first + point.second << "\n";
    return 0;
}
```

```output
3 5
Ivan 11
15
```

## Як сортуються пари

Пари порівнюються **спершу за `first`**, а якщо `first` рівні — **за `second`**. Тому `sort` для масиву пар упорядковує їх саме так:

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<pair<int, int>> pts = {{3, 1}, {1, 7}, {3, 0}, {1, 2}};
    sort(pts.begin(), pts.end());
    for (auto p : pts) cout << "(" << p.first << "," << p.second << ") ";
    cout << "\n";
    return 0;
}
```

```output
(1,2) (1,7) (3,0) (3,1)
```

Це дуже зручно: щоб упорядкувати точки за `x`, а при однакових `x` — за `y`, нічого додатково писати не потрібно.

### Трюк: збережи номер

Відсортувавши масив, ми втрачаємо інформацію про те, де стояв кожен елемент. Щоб її зберегти, складаємо пари **(значення, початковий номер)**:

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<int, int>> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i].first;
        a[i].second = i + 1;          // номер елемента з одиниці
    }
    sort(a.begin(), a.end());
    for (auto p : a) cout << p.second << " ";
    cout << "\n";
    return 0;
}
```

```input
4
40 10 30 20
```

```output
2 4 3 1
```

Найменше значення 10 стояло другим, наступне (20) — четвертим, і так далі.

## `struct` — власний тип даних

Коли полів більше двох або їм хочеться дати зрозумілі імена, створюють власний тип — **структуру**:

```cpp
struct Student {
    string name;
    int score;
    int age;
};
```

Тепер `Student` — такий самий тип, як `int`: можна створювати змінні і масиви цього типу. До полів звертаються через крапку:

```cpp
#include <iostream>
#include <string>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    Student s;
    s.name = "Olena";
    s.score = 95;
    Student t = {"Petro", 87};
    cout << s.name << " " << s.score << "\n";
    cout << t.name << " " << t.score << "\n";
    return 0;
}
```

```output
Olena 95
Petro 87
```

Опис структури (зі словом `struct` і крапкою з комою в кінці!) розміщують перед `main`, як і функції.

## Сортування за власним правилом

Як сортувати учнів? Звичайне порівняння `<` для структур не визначене: компілятор не знає, що важливіше — ім’я чи бал. Ми можемо самі передати в `sort` правило порівняння — **компаратор**. Це функція, яка отримує два елементи `a` і `b` і повертає `true`, якщо `a` має стояти **раніше** за `b`.

Відсортуємо учнів за балом (від більшого до меншого), а при рівних балах — за іменем за абеткою:

```cpp
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

struct Student {
    string name;
    int score;
};

bool better(const Student &a, const Student &b) {
    if (a.score != b.score) return a.score > b.score;   // більший бал — раніше
    return a.name < b.name;                              // інакше за абеткою
}

int main() {
    int n;
    cin >> n;
    vector<Student> v(n);
    for (auto &s : v) cin >> s.name >> s.score;
    sort(v.begin(), v.end(), better);
    for (auto &s : v) cout << s.name << " " << s.score << "\n";
    return 0;
}
```

```input
4
Petro 87
Olena 95
Andriy 87
Iryna 100
```

```output
Iryna 100
Olena 95
Andriy 87
Petro 87
```

Компаратор можна записати й прямо в місці виклику — як **лямбда-функцію** (функцію без імені):

```cpp
sort(v.begin(), v.end(), [](const Student &a, const Student &b) {
    if (a.score != b.score) return a.score > b.score;
    return a.name < b.name;
});
```

> [!CAUTION] Компаратор — тільки строга нерівність
> Для рівних елементів компаратор має повертати `false`. Пиши `<` чи `>`, але **ніколи** `<=` чи `>=`: з нестрогим порівнянням `sort` може працювати неправильно і навіть аварійно зупинити програму.

> [!TIP]
> Якщо при рівних значеннях треба зберегти початковий порядок елементів, використовуй `stable_sort` замість `sort` — він «стабільний» і не переставляє рівні елементи.

## Перевір себе

```quiz
? У якому порядку `sort` розставить пари `{2, 5}`, `{1, 9}`, `{2, 1}`?
+ `{1, 9}`, `{2, 1}`, `{2, 5}`
- `{2, 1}`, `{2, 5}`, `{1, 9}`
- `{1, 9}`, `{2, 5}`, `{2, 1}`
: Спершу за `first`, а при рівних `first` — за `second`.

? Як звернутися до поля `score` змінної `s` типу `Student`?
- `s[score]`
+ `s.score`
- `score(s)`
: До полів структури звертаються через крапку.

? Що має повертати компаратор `cmp(a, b)`?
+ `true`, якщо `a` має стояти раніше за `b`
- `true`, якщо `a` і `b` рівні
- Різницю `a − b`
: Компаратор відповідає на питання «чи має `a` йти перед `b`?».

? Чому не можна писати в компараторі `return a.score >= b.score;`?
- Це повільніше
+ Для рівних елементів компаратор має повертати `false`, інакше `sort` може зламатися
- Так можна, різниці немає
: Компаратор має бути строгим порівнянням.
```

## Практика

```exercise
id: sort-points
title: Точки
level: 1
=== statement
Дано `n` точок на площині. Впорядкуй їх за зростанням координати `x`, а точки з однаковою `x` — за зростанням `y`.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). Далі `n` рядків, у кожному — цілі координати `x` і `y`, за модулем не більші 10⁹.
=== output
`n` рядків з координатами точок у потрібному порядку.
=== example
4
3 1
1 7
3 0
1 2
---
1 2
1 7
3 0
3 1
=== test
1
0 0
---
0 0
=== test
3
-1 5
-1 -5
-2 0
---
-2 0
-1 -5
-1 5
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<int, int>> p(n);
    for (auto &q : p) cin >> q.first >> q.second;
    sort(p.begin(), p.end());
    for (auto &q : p) cout << q.first << " " << q.second << "\n";
    return 0;
}
```

```exercise
id: rating
title: Рейтинг
level: 2
=== statement
Дано імена учасників олімпіади і їхні бали. Виведи імена в порядку рейтингу: спершу ті, хто набрав більше балів; при рівних балах — за абеткою.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁴). Далі `n` рядків: ім’я (латинськими літерами, без пробілів, до 20 символів) і бал — ціле число від 0 до 400. Усі імена різні.
=== output
`n` рядків з іменами в порядку рейтингу.
=== example
4
Petro 87
Olena 95
Andriy 87
Iryna 100
---
Iryna
Olena
Andriy
Petro
=== test
1
Max 0
---
Max
=== test
3
bob 10
Bob 10
alice 10
---
Bob
alice
bob
=== hint
Опиши структуру з полями `name` і `score` та компаратор: якщо бали різні — більший бал раніше, інакше — менше ім’я раніше.
=== hint
Великі латинські літери в порівнянні рядків «менші» за малі, тому `Bob` стоїть раніше за `alice`.
=== solution
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    int n;
    cin >> n;
    vector<Student> v(n);
    for (auto &s : v) cin >> s.name >> s.score;
    sort(v.begin(), v.end(), [](const Student &a, const Student &b) {
        if (a.score != b.score) return a.score > b.score;
        return a.name < b.name;
    });
    for (auto &s : v) cout << s.name << "\n";
    return 0;
}
```

```exercise
id: original-order
title: Хто де стояв
level: 2
=== statement
Дано `n` чисел. Уяви, що їх відсортували за неспаданням (при рівних значеннях раніше йде те, що раніше стояло у введенні). Виведи для кожного місця у відсортованому масиві початковий номер числа, яке там опинилося (нумерація з одиниці).
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). У другому — `n` цілих чисел, кожне за модулем не більше 10⁹.
=== output
`n` номерів через пробіл.
=== example
4
40 10 30 20
---
2 4 3 1
=== example
3
5 5 1
---
3 1 2
=== test
1
7
---
1
=== test
5
2 2 2 2 2
---
1 2 3 4 5
=== hint
Сортуй пари (значення, номер). При рівних значеннях пари порівнюються за номером — саме так, як вимагає умова.
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<int, int>> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i].first;
        a[i].second = i + 1;
    }
    sort(a.begin(), a.end());
    for (auto &p : a) cout << p.second << " ";
    cout << "\n";
    return 0;
}
```

```exercise
id: segments-length
title: Відрізки за довжиною
level: 2
=== statement
Дано `n` відрізків на прямій, кожен заданий кінцями `l` і `r` (`l ≤ r`). Впорядкуй відрізки за довжиною (`r − l`) від найкоротшого до найдовшого, а відрізки однакової довжини — за лівим кінцем.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). Далі `n` рядків з цілими числами `l` і `r` (−10⁹ ≤ l ≤ r ≤ 10⁹).
=== output
Відрізки в потрібному порядку, кожен у окремому рядку.
=== example
3
0 10
5 7
1 3
---
1 3
5 7
0 10
=== test
1
-5 5
---
-5 5
=== test
3
4 4
-1000000000 1000000000
2 2
---
2 2
4 4
-1000000000 1000000000
=== hint
Довжина може сягати 2·10⁹ — порівнюй довжини в `long long`, наприклад `(long long)a.second - a.first`.
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<long long, long long>> s(n);
    for (auto &p : s) cin >> p.first >> p.second;
    sort(s.begin(), s.end(), [](const pair<long long, long long> &a, const pair<long long, long long> &b) {
        long long la = a.second - a.first, lb = b.second - b.first;
        if (la != lb) return la < lb;
        return a.first < b.first;
    });
    for (auto &p : s) cout << p.first << " " << p.second << "\n";
    return 0;
}
```

## Коротко

- `pair<A, B>` зберігає два значення: `first` і `second`; пари сортуються за `first`, потім за `second`.
- Щоб пам’ятати початкові позиції, сортуй пари (значення, номер).
- `struct` створює власний тип з іменованими полями; до полів звертаються через крапку.
- Компаратор — функція `cmp(a, b)`, що повертає `true`, якщо `a` має стояти раніше; лише строгі порівняння.
- `stable_sort` зберігає порядок рівних елементів.
