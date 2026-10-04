# Рядки (string)

Рядок — це текст: слово, речення, номер телефону чи навіть число з тисячі цифр. У C++ для роботи з текстом є тип `string`. Він уміє багато чого: дізнаватися довжину, склеювати, шукати, вирізати частини.

> [!NOTE] У цьому уроці
> - як читати слово і цілий рядок;
> - довжина рядка і доступ до символів;
> - склеювання і порівняння рядків;
> - пошук і вирізання частин рядка;
> - перетворення між числами і рядками;
> - як працювати з дуже великими числами як з рядками.

## Тип `string`

Рядки описані в бібліотеці `string`. Значення рядка записують у **подвійних** лапках:

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "Olena";
    string greeting = "Hello, " + name + "!";
    cout << greeting << "\n";
    cout << greeting.size() << "\n";
    return 0;
}
```

```output
Hello, Olena!
13
```

`s.size()` (або `s.length()`) — кількість символів у рядку. Знак `+` **склеює** рядки, а `s += "!"` дописує текст у кінець.

## Символи рядка

Рядок — це, по суті, масив символів. До символу з індексом `i` звертаються як `s[i]`, індекси — від 0 до `s.size() - 1`. Символи можна і читати, і змінювати.

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "programming";
    cout << s[0] << s[s.size() - 1] << "\n";   // перша і остання літери
    int count = 0;
    for (char c : s) {
        if (c == 'm') count++;
    }
    cout << count << "\n";
    s[0] = 'P';
    cout << s << "\n";
    return 0;
}
```

```output
pg
2
Programming
```

## Читання: слово чи рядок

- `cin >> s` читає **одне слово** — до першого пробілу чи переходу на новий рядок.
- `getline(cin, s)` читає **увесь рядок** разом із пробілами — до переходу на новий рядок.

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string word, line;
    cin >> word;
    getline(cin >> ws, line);   // ws пропускає залишок попереднього рядка
    cout << "[" << word << "]\n";
    cout << "[" << line << "]\n";
    return 0;
}
```

```input
first
second line with spaces
```

```output
[first]
[second line with spaces]
```

> [!CAUTION] Пастка `cin` + `getline`
> Після `cin >> n` (чи `cin >> word`) у вводі залишається символ переходу на новий рядок. Якщо одразу викликати `getline(cin, s)`, він прочитає цей «порожній залишок» і `s` виявиться порожнім. Рішення: пиши `getline(cin >> ws, s)` — `ws` пропускає всі пробіли й переходи на новий рядок перед текстом. Або виклич `cin.ignore();` перед `getline`.

## Порівняння рядків

Рядки порівнюють звичайними операціями `==`, `!=`, `<`, `>`. Порівняння `<` — **лексикографічне**, як у словнику: спершу порівнюються перші символи, якщо вони рівні — другі, і так далі.

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string a = "apple", b = "apricot";
    cout << (a < b) << "\n";              // 'p' < 'r' у третьому символі
    cout << (string("car") < "cart") << "\n";   // префікс менший
    cout << (string("Zoo") < "apple") << "\n";  // великі літери «менші» за малі
    return 0;
}
```

```output
1
1
1
```

> [!WARNING]
> Порівнюються **коди** символів, тому всі великі латинські літери менші за малі: `"Zoo" < "apple"`. А рядки з цифрами порівнюються як текст, а не як числа: `"9" > "10"`, бо `'9' > '1'`.

## Пошук і частини рядка

| Команда | Що робить | `s = "hello world"` |
| --- | --- | --- |
| `s.substr(pos, len)` | частина рядка від `pos` довжиною `len` | `s.substr(6, 5)` → `"world"` |
| `s.substr(pos)` | частина від `pos` до кінця | `s.substr(6)` → `"world"` |
| `s.find(t)` | позиція першого входження `t` | `s.find("o")` → 4 |
| `s.erase(pos, len)` | видалити `len` символів від `pos` | |
| `s.insert(pos, t)` | вставити `t` на позицію `pos` | |

Якщо `find` нічого не знайшов, він повертає особливе значення `string::npos`:

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "hello world";
    if (s.find("wor") != string::npos) {
        cout << "found at " << s.find("wor") << "\n";
    }
    if (s.find("xyz") == string::npos) {
        cout << "not found" << "\n";
    }
    cout << s.substr(0, 5) << "\n";
    return 0;
}
```

```output
found at 6
not found
hello
```

Щоб перевернути рядок, є функція `reverse` з бібліотеки `algorithm`: `reverse(s.begin(), s.end());`.

## Числа і рядки

- `to_string(n)` перетворює число на рядок: `to_string(2024)` → `"2024"`.
- `stoi(s)` і `stoll(s)` перетворюють рядок на `int` чи `long long`: `stoi("42")` → 42.

Перетворення числа на рядок — зручний спосіб працювати з його цифрами: `to_string(n).size()` — кількість цифр, а `s[i] - '0'` — значення цифри.

## Дуже великі числа

Що робити, якщо в задачі число має тисячу цифр? У `long long` воно не вміститься. Але його можна прочитати як **рядок** і працювати з цифрами окремо:

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string num;
    cin >> num;
    int sum = 0;
    for (char c : num) sum += c - '0';
    cout << sum << "\n";
    // остання цифра визначає парність
    cout << ((num.back() - '0') % 2 == 0 ? "EVEN" : "ODD") << "\n";
    return 0;
}
```

```input
123456789012345678901234567890
```

```output
135
EVEN
```

`num.back()` — останній символ рядка. Так перевіряють і подільність на 2, 5 чи 10 (за останньою цифрою), на 3 і 9 (за сумою цифр).

## Перевір себе

```quiz
? Що прочитає `cin >> s`, якщо ввести `New York`?
+ `New`
- `New York`
- `York`
: `cin >>` читає одне слово — до пробілу. Для цілого рядка потрібен `getline`.

? Чому дорівнює `string("abcdef").substr(2, 3)`?
- `"bcd"`
+ `"cde"`
- `"cdef"`
: Від індексу 2 (символ `c`) беремо 3 символи.

? Що виведе фрагмент?
| string s = "cat";
| s += "s";
| cout << s.size();
- 3
+ 4
- cats
: Після дописування рядок стає `"cats"`, у ньому 4 символи.

? Який результат порівняння `"10" < "9"` для рядків?
+ Істина
- Хиба
- Помилка компіляції
: Рядки порівнюються посимвольно: `'1' < '9'`, тому `"10"` менший.

? Як перевірити, що підрядка `t` немає в рядку `s`?
- `s.find(t) == -1`
+ `s.find(t) == string::npos`
- `s.find(t) == 0`
: Якщо нічого не знайдено, `find` повертає `string::npos`. А `0` означає, що `t` знайдено на самому початку.
```

## Практика

```exercise
id: palindrome
title: Паліндром
level: 1
=== statement
Дано слово з малих латинських літер. Виведи `YES`, якщо воно однаково читається в обох напрямках (паліндром), і `NO` в іншому разі.
=== input
Одне слово з малих латинських літер довжиною від 1 до 10⁵.
=== output
`YES` або `NO`.
=== example
level
---
YES
=== example
hello
---
NO
=== test
a
---
YES
=== test
ab
---
NO
=== test
abba
---
YES
=== test
abca
---
NO
=== hint
Порівнюй `s[i]` і `s[n - 1 - i]` для `i` до середини рядка. Або переверни копію рядка і порівняй з початковим.
=== solution
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    int n = s.size();
    bool ok = true;
    for (int i = 0; i < n / 2; i++) {
        if (s[i] != s[n - 1 - i]) ok = false;
    }
    cout << (ok ? "YES" : "NO") << "\n";
    return 0;
}
```

```exercise
id: vowels
title: Голосні
level: 1
=== statement
Дано рядок англійського тексту. Скільки в ньому голосних літер `a`, `e`, `i`, `o`, `u` (великих чи малих)?
=== input
Один рядок довжиною до 10⁵ символів: латинські літери, пробіли, розділові знаки.
=== output
Кількість голосних.
=== example
Hello, World!
---
3
=== example
Programming is FUN
---
5
=== test
xyz
---
0
=== test
AEIOU aeiou
---
10
=== hint
Рядок містить пробіли, тож читай його через `getline(cin, s)`. Велику літеру можна перетворити на малу функцією `tolower`.
=== solution
#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    int count = 0;
    for (char c : s) {
        char d = tolower(c);
        if (d == 'a' || d == 'e' || d == 'i' || d == 'o' || d == 'u') count++;
    }
    cout << count << "\n";
    return 0;
}
```

```exercise
id: big-number
title: Велике число
level: 1
=== statement
Дано натуральне число, в якому може бути до 10⁵ цифр. Виведи суму його цифр, а в наступному рядку — `YES`, якщо число ділиться на 3, і `NO` — якщо ні.
=== input
Одне натуральне число без нулів на початку, від 1 до 10⁵ цифр.
=== output
Два рядки: сума цифр і `YES` або `NO`.
=== example
123456789012345678901234567890
---
135
YES
=== example
1000000000000000000000001
---
2
NO
=== test
3
---
3
YES
=== test
1
---
1
NO
=== test
99999999999999999999999999999999999999999999999999
---
450
YES
=== hint
Число ділиться на 3 тоді й лише тоді, коли сума його цифр ділиться на 3.
=== solution
#include <iostream>
#include <string>
using namespace std;

int main() {
    string num;
    cin >> num;
    long long sum = 0;
    for (char c : num) sum += c - '0';
    cout << sum << "\n";
    cout << (sum % 3 == 0 ? "YES" : "NO") << "\n";
    return 0;
}
```

```exercise
id: words-count
title: Кількість слів
level: 2
=== statement
Дано рядок, що складається з латинських літер і пробілів. Словом називається послідовність літер без пробілів. Між словами може бути кілька пробілів, а на початку рядка — пробіли. Скільки в рядку слів?
=== input
Один рядок довжиною до 10⁵ символів.
=== output
Кількість слів.
=== example
I love   programming
---
3
=== example
   one
---
1
=== test
a b c d e
---
5
=== test
word
---
1
=== test
   many    spaces   here
---
3
=== hint
Слово починається там, де стоїть літера, а перед нею — пробіл або початок рядка. Порахуй такі місця.
=== solution
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    int count = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] != ' ' && (i == 0 || s[i - 1] == ' ')) count++;
    }
    cout << count << "\n";
    return 0;
}
```

```exercise
id: rle
title: Стиснення рядка
level: 2
=== statement
Стисни рядок так: кожну групу однакових символів, що стоять поруч, заміни символом і кількістю повторень. Наприклад, `aaabccdddd` → `a3b1c2d4`.
=== input
Один рядок з малих латинських літер довжиною від 1 до 10⁵.
=== output
Стиснений рядок.
=== example
aaabccdddd
---
a3b1c2d4
=== example
abc
---
a1b1c1
=== test
z
---
z1
=== test
zzzzzzzzzzzz
---
z12
=== test
aabbaa
---
a2b2a2
=== hint
Іди рядком і рахуй, скільки разів поспіль повторюється поточний символ. Коли наступний символ інший (або рядок закінчився), виведи символ і лічильник.
=== solution
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    int n = s.size();
    int i = 0;
    while (i < n) {
        int j = i;
        while (j < n && s[j] == s[i]) j++;
        cout << s[i] << j - i;
        i = j;
    }
    cout << "\n";
    return 0;
}
```

```exercise
id: longest-word
title: Найдовше слово
level: 2
=== statement
Дано кілька слів, розділених пробілами і переходами на новий рядок. Знайди найдовше слово. Якщо таких кілька, виведи те, що трапилося першим.
=== input
Від 1 до 10⁴ слів з латинських літер, кожне довжиною до 100.
=== output
Найдовше слово.
=== example
the quick brown fox jumps
---
quick
=== example
a bb cc d
---
bb
=== test
single
---
single
=== test
ab
cde
fgh
---
cde
=== hint
Читай слова в циклі `while (cin >> w)` і запам’ятовуй найдовше. Для «першого з найдовших» порівнюй строго: `w.size() > best.size()`.
=== solution
#include <iostream>
#include <string>
using namespace std;

int main() {
    string w, best;
    while (cin >> w) {
        if (w.size() > best.size()) best = w;
    }
    cout << best << "\n";
    return 0;
}
```

## Коротко

- `string` — тип для тексту; значення пишуть у подвійних лапках.
- `s.size()` — довжина; `s[i]` — символ; `+` склеює рядки; `==`, `<` порівнюють (лексикографічно).
- `cin >> s` читає слово, `getline(cin >> ws, s)` — увесь рядок.
- `substr`, `find` (і `string::npos`), `erase`, `insert`, `reverse` — пошук і зміна частин рядка.
- `to_string`, `stoi`, `stoll` — перетворення між числами і рядками.
- Дуже великі числа читають як рядки і обробляють цифра за цифрою.
