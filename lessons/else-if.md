# Кілька варіантів: else if і switch

Буває, що варіантів не два, а більше: число може бути від’ємним, нулем або додатним; оцінка — низькою, середньою, достатньою чи високою. У цьому уроці навчимося вибирати з кількох варіантів.

> [!NOTE] У цьому уроці
> - ланцюжки `if … else if … else`;
> - чому важливий порядок перевірок;
> - оператор `switch` для вибору за значенням;
> - короткий умовний вираз `? :`.

## Ланцюжок `else if`

Після `else` можна одразу написати наступний `if`. Так утворюється ланцюжок перевірок:

```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n > 0) {
        cout << "positive" << "\n";
    } else if (n < 0) {
        cout << "negative" << "\n";
    } else {
        cout << "zero" << "\n";
    }
    return 0;
}
```

```input
-4
```

```output
negative
```

Умови перевіряються **згори донизу**. Щойно якась виявиться істинною, виконується її блок, а решта ланцюжка пропускається. Останній `else` спрацьовує, якщо жодна умова не виконалася. Отже, завжди виконується **рівно один** блок.

## Порядок перевірок має значення

Нехай за кількістю балів треба визначити рівень: від 10 балів — `high`, від 7 — `good`, від 4 — `medium`, інакше — `low`.

```cpp
#include <iostream>
using namespace std;

int main() {
    int score;
    cin >> score;
    if (score >= 10) {
        cout << "high" << "\n";
    } else if (score >= 7) {
        cout << "good" << "\n";
    } else if (score >= 4) {
        cout << "medium" << "\n";
    } else {
        cout << "low" << "\n";
    }
    return 0;
}
```

```input
8
```

```output
good
```

У другій перевірці не потрібно писати `score >= 7 && score < 10`: якби бали були від 10, ми б сюди просто не дійшли.

А тепер переставимо перевірки:

```cpp
if (score >= 4) {
    cout << "medium";
} else if (score >= 10) {
    cout << "high";     // сюди програма не потрапить ніколи!
}
```

Для 12 балів спрацює вже перша умова (12 ≥ 4), і програма виведе `medium`. Тому в ланцюжку спершу перевіряють «найсуворіші» умови.

> [!TIP]
> Перевір ланцюжок на «граничних» значеннях: для 3, 4, 6, 7, 9 і 10 балів. Саме на межах найчастіше бувають помилки.

## Оператор `switch`

Коли треба вибрати дію за **конкретним значенням** змінної, зручно використати `switch`:

```cpp
#include <iostream>
using namespace std;

int main() {
    int d;
    cin >> d;
    switch (d) {
        case 1: cout << "Monday"; break;
        case 2: cout << "Tuesday"; break;
        case 3: cout << "Wednesday"; break;
        case 4: cout << "Thursday"; break;
        case 5: cout << "Friday"; break;
        case 6:
        case 7: cout << "Weekend"; break;
        default: cout << "Error";
    }
    cout << "\n";
    return 0;
}
```

```input
6
```

```output
Weekend
```

Як це працює:

- `switch (d)` бере значення `d` і шукає мітку `case` з таким самим значенням;
- з цієї мітки починається виконання і триває до `break`;
- `default` спрацьовує, якщо жодна мітка не підійшла (як останній `else`).

Мітки `case 6:` і `case 7:` стоять поруч, тому для обох значень виконується той самий код.

> [!CAUTION] Забутий `break`
> Без `break` виконання «провалюється» в наступні мітки:
> ```cpp
> switch (2) {
>     case 1: cout << "one ";
>     case 2: cout << "two ";
>     case 3: cout << "three ";
> }
> ```
> Цей код виведе `two three`, бо після `case 2` немає `break`.

`switch` працює лише з цілими числами і символами (`char`). Ось калькулятор, який читає вираз на кшталт `7 * 6`:

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    char op;
    cin >> a >> op >> b;
    switch (op) {
        case '+': cout << a + b; break;
        case '-': cout << a - b; break;
        case '*': cout << a * b; break;
        case '/':
            if (b == 0) cout << "ERROR";
            else cout << a / b;
            break;
        default: cout << "Unknown operation";
    }
    cout << "\n";
    return 0;
}
```

```input
7 * 6
```

```output
42
```

## Умовний вираз `? :`

Для простого вибору з двох значень є короткий запис:

```cpp
умова ? значення_якщо_так : значення_якщо_ні
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    int biggest = (a > b) ? a : b;
    cout << biggest << "\n";
    cout << (a % 2 == 0 ? "EVEN" : "ODD") << "\n";
    return 0;
}
```

```input
3 8
```

```output
8
ODD
```

Використовуй `? :` для коротких виразів, а для складних рішень краще писати звичайні `if`.

## Перевір себе

```quiz
? Що виведе фрагмент для `n = 0`?
| if (n > 0) cout << "A";
| else if (n == 0) cout << "B";
| else cout << "C";
- A
+ B
- BC
: Перша умова хибна, друга — істинна. Після неї решта ланцюжка пропускається.

? Що виведе фрагмент для `x = 15`?
| if (x > 5) cout << "big";
| else if (x > 10) cout << "very big";
+ `big`
- `very big`
- `bigvery big`
: Спрацювала перша умова, і на другу програма не дивиться. Тому спершу треба перевіряти `x > 10`.

? Для чого в `switch` пишуть `break`?
- Щоб завершити програму
+ Щоб не виконувати код наступних міток `case`
- Щоб перейти до `default`
: Без `break` виконання продовжується в наступних мітках.

? Чому дорівнює `(7 > 3) ? 10 : 20`?
+ 10
- 20
- 7
: Умова істинна, тому вибирається значення після `?`.
```

## Практика

```exercise
id: sign
title: Знак числа
level: 1
=== statement
Дано ціле число. Виведи `1`, якщо воно додатне, `-1`, якщо від’ємне, і `0`, якщо дорівнює нулю.
=== input
Одне ціле число, за модулем не більше 10⁹.
=== output
`1`, `-1` або `0`.
=== example
25
---
1
=== example
-3
---
-1
=== test
0
---
0
=== test
-1000000000
---
-1
=== test
1
---
1
=== solution
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n > 0) {
        cout << 1 << "\n";
    } else if (n < 0) {
        cout << -1 << "\n";
    } else {
        cout << 0 << "\n";
    }
    return 0;
}
```

```exercise
id: older
title: Хто старший
level: 1
=== statement
Дано вік двох друзів. Виведи `1`, якщо старший перший, `2`, якщо старший другий, і `EQUAL`, якщо вони однолітки.
=== input
Два цілих числа від 1 до 100.
=== output
`1`, `2` або `EQUAL`.
=== example
12 14
---
2
=== example
13 13
---
EQUAL
=== test
15 9
---
1
=== test
1 100
---
2
=== solution
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    if (a > b) {
        cout << "1\n";
    } else if (b > a) {
        cout << "2\n";
    } else {
        cout << "EQUAL\n";
    }
    return 0;
}
```

```exercise
id: season
title: Пора року
level: 1
=== statement
Дано номер місяця від 1 до 12. Виведи пору року англійською: `winter` (грудень, січень, лютий), `spring` (березень — травень), `summer` (червень — серпень) або `autumn` (вересень — листопад).
=== input
Одне ціле число від 1 до 12.
=== output
Назва пори року.
=== example
1
---
winter
=== example
9
---
autumn
=== test
12
---
winter
=== test
2
---
winter
=== test
3
---
spring
=== test
5
---
spring
=== test
6
---
summer
=== test
8
---
summer
=== test
11
---
autumn
=== hint
Зима — це місяці 12, 1 і 2: їх зручно перевірити першими, а далі — ланцюжок порівнянь `m <= 5`, `m <= 8`, `m <= 11`.
=== solution
#include <iostream>
using namespace std;

int main() {
    int m;
    cin >> m;
    if (m == 12 || m <= 2) {
        cout << "winter\n";
    } else if (m <= 5) {
        cout << "spring\n";
    } else if (m <= 8) {
        cout << "summer\n";
    } else {
        cout << "autumn\n";
    }
    return 0;
}
```

```exercise
id: grade
title: Рівень навчальних досягнень
level: 2
=== statement
У школі оцінки ставлять за 12-бальною шкалою. Оцінки 1–3 відповідають початковому рівню, 4–6 — середньому, 7–9 — достатньому, 10–12 — високому. Дано оцінку. Виведи `initial`, `average`, `sufficient` або `high`.
=== input
Одне ціле число від 1 до 12.
=== output
Назва рівня.
=== example
8
---
sufficient
=== example
12
---
high
=== test
1
---
initial
=== test
3
---
initial
=== test
4
---
average
=== test
6
---
average
=== test
7
---
sufficient
=== test
9
---
sufficient
=== test
10
---
high
=== solution
#include <iostream>
using namespace std;

int main() {
    int g;
    cin >> g;
    if (g >= 10) {
        cout << "high\n";
    } else if (g >= 7) {
        cout << "sufficient\n";
    } else if (g >= 4) {
        cout << "average\n";
    } else {
        cout << "initial\n";
    }
    return 0;
}
```

```exercise
id: calculator
title: Калькулятор
level: 2
=== statement
Дано вираз з двох цілих чисел і знака дії між ними: `+`, `-`, `*` або `/`. Обчисли його. Ділення — націло. Якщо треба ділити на нуль, виведи `ERROR`.
=== input
Один рядок: ціле число `a`, знак дії, ціле число `b` (числа за модулем не більше 10⁴). Між числами і знаком може бути пробіл.
=== output
Результат обчислення або `ERROR`.
=== example
7 * 6
---
42
=== example
10 / 0
---
ERROR
=== test
10 / 3
---
3
=== test
-5 + 12
---
7
=== test
3 - 10
---
-7
=== test
10000 * 10000
---
100000000
=== test
0 / 5
---
0
=== hint
Прочитай число, символ і ще одне число: `cin >> a >> op >> b;`, де `op` має тип `char`.
=== solution
#include <iostream>
using namespace std;

int main() {
    int a, b;
    char op;
    cin >> a >> op >> b;
    switch (op) {
        case '+': cout << a + b; break;
        case '-': cout << a - b; break;
        case '*': cout << a * b; break;
        case '/':
            if (b == 0) cout << "ERROR";
            else cout << a / b;
            break;
    }
    cout << "\n";
    return 0;
}
```

## Коротко

- `if … else if … else` перевіряє умови згори донизу і виконує рівно один блок.
- У ланцюжку спершу перевіряй найсуворіші умови і тестуй граничні значення.
- `switch` вибирає дію за значенням цілого числа чи символу; не забувай `break`.
- `умова ? a : b` — короткий вибір з двох значень.
