"""Package marker for apps/.

This empty ``__init__.py`` is required so that mypy maps the modules under
``apps/`` with a single, consistent package name (``apps.*``). Without it,
mypy reports "Source file found twice under different module names" because
Django imports use ``apps.<module>`` while direct file paths resolve to the
bare module name.
"""
