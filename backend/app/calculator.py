"""Pure arithmetic evaluator for the calculator API.

No use of eval/exec/compile on user input. Implements a recursive-descent
parser over a regex tokenizer, with arithmetic in decimal.Decimal so that
"0.1+0.2" yields exactly "0.3".
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import List, Tuple

MAX_EXPR_LEN = 200
MAX_DEPTH = 32

# Tokenizer: numbers (digits with optional single '.'), operators, parens,
# whitespace (ignored). Anything else is invalid.
_TOKEN_RE = re.compile(
    r"""
    \s+
    |
    (?P<NUMBER>\d+\.\d*|\.\d+|\d+)
    |
    (?P<OP>[+\-*/()])
    """,
    re.VERBOSE,
)

_OPERATORS = {"+", "-", "*", "/", "(", ")"}


class CalcError(ValueError):
    """Base class for evaluator errors that should map to HTTP 400."""


class InvalidExpression(CalcError):
    """Generic invalid input."""


class DivisionByZero(CalcError):
    """Division by zero."""


def _format_result(d: Decimal) -> str:
    """Format a Decimal result for the API response.

    Strips trailing zeros and a trailing '.', avoids exponent notation when
    the adjusted exponent is in [-6, 12]; outside that range the normalized
    output (which may use scientific notation) is acceptable per the spec.
    """
    if not d.is_finite():
        # NaN/inf are rejected elsewhere; this is just a safety net.
        raise InvalidExpression("Invalid result")

    # Use plain (non-exponent) decimal notation in all cases — the spec
    # permits normalize() outside the [-6, 12] window, but a uniform "f" format
    # is simpler and always satisfies "result is a decimal string".
    s = format(d, "f")

    # Strip trailing zeros and a trailing '.'.
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if s in ("", "-"):
        return "0"
    return s


def _tokenize(expr: str) -> List[Tuple[str, str]]:
    """Return a list of (kind, text) tokens. Raises InvalidExpression."""
    if not isinstance(expr, str):
        raise InvalidExpression("Invalid expression")
    if len(expr) > MAX_EXPR_LEN:
        raise InvalidExpression("Invalid expression")
    tokens: List[Tuple[str, str]] = []
    pos = 0
    while pos < len(expr):
        m = _TOKEN_RE.match(expr, pos)
        if not m or m.end() == pos:
            raise InvalidExpression("Invalid expression")
        text = m.group(0)
        if text.isspace():
            pos = m.end()
            continue
        if m.lastgroup == "NUMBER":
            tokens.append(("NUMBER", text))
        elif m.lastgroup == "OP":
            tokens.append(("OP", text))
        else:
            # Whitespace branch already consumed above; unreachable.
            raise InvalidExpression("Invalid expression")
        pos = m.end()
    if not tokens:
        raise InvalidExpression("Invalid expression")
    return tokens


class _Parser:
    def __init__(self, tokens: List[Tuple[str, str]]):
        self.tokens = tokens
        self.i = 0
        self.depth = 0

    def peek(self) -> Tuple[str, str] | None:
        if self.i < len(self.tokens):
            return self.tokens[self.i]
        return None

    def consume(self) -> Tuple[str, str]:
        tok = self.tokens[self.i]
        self.i += 1
        return tok

    def parse(self) -> Decimal:
        value = self.expr()
        if self.i != len(self.tokens):
            raise InvalidExpression("Invalid expression")
        return value

    def expr(self) -> Decimal:
        value = self.term()
        while True:
            tok = self.peek()
            if tok is None or tok[1] not in ("+", "-"):
                break
            op = self.consume()[1]
            rhs = self.term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def term(self) -> Decimal:
        value = self.factor()
        while True:
            tok = self.peek()
            if tok is None or tok[1] not in ("*", "/"):
                break
            op = self.consume()[1]
            rhs = self.factor()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise DivisionByZero("Division by zero")
                value = value / rhs
        return value

    def factor(self) -> Decimal:
        tok = self.peek()
        if tok is None:
            raise InvalidExpression("Invalid expression")
        if tok[1] == "-":
            self.consume()
            return -self.factor()
        if tok[1] == "+":
            self.consume()
            return self.factor()
        return self.primary()

    def primary(self) -> Decimal:
        tok = self.peek()
        if tok is None:
            raise InvalidExpression("Invalid expression")
        if tok[0] == "NUMBER":
            text = self.consume()[1]
            try:
                return Decimal(text)
            except InvalidOperation as exc:
                raise InvalidExpression("Invalid expression") from exc
        if tok[1] == "(":
            self.consume()
            if self.depth + 1 > MAX_DEPTH:
                raise InvalidExpression("Invalid expression")
            self.depth += 1
            value = self.expr()
            closing = self.peek()
            if closing is None or closing[1] != ")":
                raise InvalidExpression("Invalid expression")
            self.consume()
            self.depth -= 1
            return value
        raise InvalidExpression("Invalid expression")


def evaluate(expr: str) -> str:
    """Evaluate a user expression and return the formatted decimal string.

    Raises:
        InvalidExpression: any malformed input.
        DivisionByZero: explicit divide-by-zero.
    """
    tokens = _tokenize(expr)
    value = _Parser(tokens).parse()
    if not value.is_finite():
        raise InvalidExpression("Invalid expression")
    return _format_result(value)