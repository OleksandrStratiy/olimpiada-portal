# Сортування і алгоритми STL

**STL** (Standard Template Library — стандартна бібліотека шаблонів) — це набір готових інструментів C++: контейнери (`vector`, `set`, `map`…) і алгоритми. Найважливіший з алгоритмів — **сортування**. Відсортовані дані відкривають шлях до десятків інших прийомів.

> [!NOTE] У цьому уроці
> - функція `sort`: за зростанням і за спаданням;
> - що дає відсортований масив: медіана, найближчі числа, різні значення;
> - `reverse`, `min_element`, `max_element`, `count`, `find`, `accumulate`;
> - видалення повторів: `unique`.

## Функція `sort`

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> a = {5, 2, 9, 1, 7};
    sort(a.begin(), a.end());
    for (int x : a) cout << x << " ";
    cout << "\n";
    return 0;
}
```

```output
1 2 5 7 9
```

`a.begin()` і `a.end()` вказують на **початок** і **кінець** масиву: так ми кажемо функції, яку частину сортувати. (Точніше, `a.end()` вказує на місце **після** останнього елемента.) Такі «вказівники на позицію» називають **ітераторами**.

Зверни увагу на новий спосіб створити масив: `vector<int> a = {5, 2, 9, 1, 7};` — елементи перелічено у фігурних дужках.

> [!IMPORTANT]
> `sort` дуже швидкий: мільйон чисел він сортує за долю секунди. Самостійно писати сортування на олімпіаді не потрібно — бери `sort`.

## Інший порядок

За **спаданням** можна сортувати, передавши третій аргумент `greater<int>()` («більший — раніше»):

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;

int main() {
    vector<int> a = {5, 2, 9, 1, 7};
    sort(a.begin(), a.end(), greater<int>());
    for (int x : a) cout << x << " ";
    cout << "\n";

    vector<string> words = {"pear", "apple", "fig", "banana"};
    sort(words.begin(), words.end());
    for (string w : words) cout << w << " ";
    cout << "\n";
    return 0;
}
```

```output
9 7 5 2 1
apple banana fig pear
```

Рядки сортуються лексикографічно — як у словнику. Можна сортувати і частину масиву: `sort(a.begin(), a.begin() + k)` впорядкує лише перші `k` елементів.

## Що дає відсортований масив

Після сортування багато задач розв’язуються майже миттєво:

- найменший елемент — `a[0]`, найбільший — `a[n - 1]`;
- **k-й за величиною** — `a[k - 1]`;
- **медіана** (середній за величиною елемент) — `a[n / 2]` для непарного `n`;
- **однакові значення стоять поруч**, тому повтори легко знайти, порівнюючи сусідів;
- **найближчі за значенням числа** — теж сусіди.

Наприклад, найменша різниця між двома числами масиву:

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    sort(a.begin(), a.end());
    int best = a[1] - a[0];
    for (int i = 2; i < n; i++) {
        best = min(best, a[i] - a[i - 1]);
    }
    cout << best << "\n";
    return 0;
}
```

```input
5
30 4 19 25 11
```

```output
5
```

Без сортування довелося б порівнювати всі пари — це n² дій замість n log n.

## Інші корисні алгоритми

| Виклик | Що робить |
| --- | --- |
| `reverse(a.begin(), a.end())` | перевертає масив |
| `*min_element(a.begin(), a.end())` | найменший елемент |
| `*max_element(a.begin(), a.end())` | найбільший елемент |
| `max_element(a.begin(), a.end()) - a.begin()` | **індекс** найбільшого елемента |
| `count(a.begin(), a.end(), x)` | скільки разів трапляється `x` |
| `find(a.begin(), a.end(), x)` | ітератор на перше `x` (або `a.end()`, якщо немає) |
| `accumulate(a.begin(), a.end(), 0LL)` | сума елементів (бібліотека `numeric`) |

`min_element` і `max_element` повертають не значення, а **ітератор** — позицію елемента. Зірочка `*` перед ним дає значення, а різниця з `a.begin()` — індекс.

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    vector<int> a = {4, 8, 1, 8, 3};
    cout << *max_element(a.begin(), a.end()) << " ";
    cout << max_element(a.begin(), a.end()) - a.begin() << " ";
    cout << count(a.begin(), a.end(), 8) << " ";
    cout << accumulate(a.begin(), a.end(), 0LL) << "\n";
    return 0;
}
```

```output
8 1 2 24
```

> [!CAUTION]
> Третій аргумент `accumulate` — початкове значення суми, і від нього залежить **тип** суми. З `0` сума рахуватиметься в `int` і може переповнитися. Пиши `0LL`.

## Слово `auto`

Буває, що тип змінної довгий або й так зрозумілий з того, що їй присвоюють. Тоді замість типу можна написати `auto` — компілятор визначить його сам:

```cpp
auto it = max_element(a.begin(), a.end());   // ітератор: його тип довго записувати
for (auto &x : a) cin >> x;                  // x — посилання на елемент масиву, хоч би якого типу
```

Не зловживай `auto` для простих змінних: `int n = 5;` зрозуміліше, ніж `auto n = 5;`.

## Видалення повторів

Функція `unique` прибирає **сусідні** однакові елементи: вона зсуває унікальні значення на початок і повертає позицію, де вони закінчуються. Тому спершу масив сортують, щоб однакові значення стояли поруч, а потім «обрізають хвіст»:

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> a = {3, 1, 3, 2, 1, 3};
    sort(a.begin(), a.end());                       // 1 1 2 3 3 3
    a.erase(unique(a.begin(), a.end()), a.end());   // 1 2 3
    cout << a.size() << ":";
    for (int x : a) cout << " " << x;
    cout << "\n";
    return 0;
}
```

```output
3: 1 2 3
```

На відміну від масиву лічильників, цей спосіб працює для будь-яких значень, навіть до 10¹⁸.

## Перевір себе

```quiz
? Як відсортувати масив `a` за спаданням?
- `sort(a.begin(), a.end());`
+ `sort(a.begin(), a.end(), greater<int>());`
- `sort(a.end(), a.begin());`
: `greater<int>()` задає порядок, у якому більший елемент іде раніше.

? Масив відсортовано за зростанням, у ньому 7 елементів. Де медіана?
- `a[3.5]`
+ `a[3]`
- `a[7]`
: Середній з семи елементів має індекс 3 (три елементи ліворуч і три праворуч).

? Що поверне `count(a.begin(), a.end(), 5)` для масиву `{5, 1, 5, 5}`?
+ 3
- 1
- 0
: Число 5 трапляється тричі.

? Навіщо перед `unique` сортувати масив?
+ `unique` прибирає лише сусідні повтори, а після сортування однакові значення стоять поруч
- Без сортування `unique` не скомпілюється
- Сортувати не потрібно
: Для масиву `{1, 2, 1}` без сортування `unique` нічого не прибере.
```

## Практика

```exercise
id: sort-asc
title: Відсортуй
level: 1
=== statement
Дано `n` цілих чисел. Виведи їх у порядку неспадання.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). У другому — `n` цілих чисел, кожне за модулем не більше 10⁹.
=== output
Відсортовані числа через пробіл.
=== example
5
5 2 9 1 7
---
1 2 5 7 9
=== test
1
3
---
3
=== test
6
3 -1 3 0 -1 2
---
-1 -1 0 2 3 3
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    sort(a.begin(), a.end());
    for (int x : a) cout << x << " ";
    cout << "\n";
    return 0;
}
```

```exercise
id: top-k
title: Три найкращі
level: 1
=== statement
На змаганнях `n` учасників отримали бали. Виведи бали трьох найкращих учасників у порядку спадання. Якщо учасників менше трьох, виведи бали всіх.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). У другому — `n` цілих чисел від 0 до 10⁹.
=== output
До трьох чисел у порядку незростання.
=== example
6
70 95 80 100 60 95
---
100 95 95
=== example
2
5 8
---
8 5
=== test
1
0
---
0
=== test
3
1 2 3
---
3 2 1
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    sort(a.begin(), a.end(), greater<int>());
    for (int i = 0; i < n && i < 3; i++) cout << a[i] << " ";
    cout << "\n";
    return 0;
}
```

```exercise
id: median
title: Медіана
level: 1
=== statement
Медіана набору з непарної кількості чисел — це число, яке опиниться посередині, якщо всі числа впорядкувати. Дано `n` чисел (`n` непарне), знайди медіану.
=== input
У першому рядку — непарне число `n` (1 ≤ n ≤ 10⁵). У другому — `n` цілих чисел, кожне за модулем не більше 10⁹.
=== output
Медіана.
=== example
5
30 4 19 25 11
---
19
=== test
1
-7
---
-7
=== test
3
5 5 1
---
5
=== test
7
7 6 5 4 3 2 1
---
4
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    sort(a.begin(), a.end());
    cout << a[n / 2] << "\n";
    return 0;
}
```

```exercise
id: anagrams
title: Анаграми
level: 2
=== statement
Два слова називаються анаграмами, якщо одне можна отримати з іншого перестановкою літер (наприклад, `listen` і `silent`). Дано два слова. Виведи `YES`, якщо вони анаграми, і `NO` в іншому разі.
=== input
Два слова з малих латинських літер, кожне довжиною від 1 до 10⁵.
=== output
`YES` або `NO`.
=== example
listen silent
---
YES
=== example
apple paper
---
NO
=== test
a a
---
YES
=== test
ab abc
---
NO
=== test
aabb abab
---
YES
=== test
aab abb
---
NO
=== hint
Якщо відсортувати літери обох слів, анаграми перетворяться на однакові рядки. `sort` працює і для `string`: `sort(s.begin(), s.end())`.
=== solution
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    cout << (a == b ? "YES" : "NO") << "\n";
    return 0;
}
```

```exercise
id: closest
title: Найближчі числа
level: 2
=== statement
Дано `n` цілих чисел. Знайди найменшу різницю між двома з них (за модулем).
=== input
У першому рядку — число `n` (2 ≤ n ≤ 10⁵). У другому — `n` цілих чисел, кожне за модулем не більше 10⁹.
=== output
Найменша різниця.
=== example
5
30 4 19 25 11
---
5
=== test
2
-1000000000 1000000000
---
2000000000
=== test
4
7 3 7 1
---
0
=== test
3
1 10 100
---
9
=== hint
Після сортування найближчі числа стоять поруч. Різниця може сягати 2·10⁹ — візьми `long long`.
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sort(a.begin(), a.end());
    long long best = a[1] - a[0];
    for (int i = 2; i < n; i++) best = min(best, a[i] - a[i - 1]);
    cout << best << "\n";
    return 0;
}
```

```exercise
id: distinct-big
title: Різні числа
level: 2
=== statement
Дано `n` цілих чисел. Виведи всі різні значення в порядку зростання.
=== input
У першому рядку — число `n` (1 ≤ n ≤ 10⁵). У другому — `n` цілих чисел, кожне за модулем не більше 10¹⁸.
=== output
У першому рядку — кількість різних чисел. У другому — самі числа в порядку зростання.
=== example
6
3 1 3 2 1 3
---
3
1 2 3
=== test
1
1000000000000000000
---
1
1000000000000000000
=== test
4
-5 -5 -5 -5
---
1
-5
=== test
5
5 4 3 2 1
---
5
1 2 3 4 5
=== solution
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sort(a.begin(), a.end());
    a.erase(unique(a.begin(), a.end()), a.end());
    cout << a.size() << "\n";
    for (long long x : a) cout << x << " ";
    cout << "\n";
    return 0;
}
```

## Коротко

- `sort(a.begin(), a.end())` — за зростанням; з `greater<int>()` — за спаданням.
- У відсортованому масиві однакові й близькі значення стоять поруч: так шукають повтори, медіану, найближчі числа.
- `reverse`, `min_element`, `max_element`, `count`, `find`, `accumulate` — готові алгоритми; суму рахуй з `0LL`.
- Різні значення: `sort`, потім `a.erase(unique(a.begin(), a.end()), a.end())`.
