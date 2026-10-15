"""Direct tests for the pure calculator evaluator."""

from __future__ import annotations

import pytest

from app import calculator


@pytest.mark.parametrize(
    "expression,expected",
    [
        ("2+3*4", "14"),
        ("(2+3)*4", "20"),
        ("10/4", "2.5"),
        ("-5+3", "-2"),
        ("2*(-3)", "-6"),
        ("0.1+0.2", "0.3"),
        ("1.50+0", "1.5"),
        ("12*(3+4)", "84"),
        ("1/3", "0.3333333333333333333333333333"),
    ],
)
def test_evaluator_arithmetic(expression: str, expected: str) -> None:
    assert calculator.evaluate(expression) == expected


@pytest.mark.parametrize(
    "expression",
    [
        "abc",
        "2+",
        "",
        "(1+2",
        "1;2",
        "__import__('os')",
        "1e5",
    ],
)
def test_evaluator_invalid_inputs(expression: str) -> None:
    with pytest.raises(calculator.InvalidExpression):
        calculator.evaluate(expression)


def test_evaluator_division_by_zero() -> None:
    with pytest.raises(calculator.DivisionByZero):
        calculator.evaluate("1/0")


def test_evaluator_too_long() -> None:
    long_expr = "1+" * 100 + "1"  # > 200 chars
    with pytest.raises(calculator.InvalidExpression):
        calculator.evaluate(long_expr)


def test_evaluator_201_char_expression() -> None:
    expr = "1" + "+1" * 100  # length 201
    assert len(expr) == 201
    with pytest.raises(calculator.InvalidExpression):
        calculator.evaluate(expr)


def test_evaluator_zero_result() -> None:
    assert calculator.evaluate("5-5") == "0"