from flaskext.markdown import Markdown


def test_markdown_filter_wraps_output_in_markup():
    md = Markdown()
    result = md("# Hello")
    assert "<h1>Hello</h1>" in str(result)
