from marshmallow import Schema, fields

from marshmallow_polyfield import PolyField


class Cat:
    def __init__(self, name):
        self.name = name


class Pet:
    def __init__(self, pet):
        self.pet = pet


class CatSchema(Schema):
    name = fields.Str()


def _schema_selector(value, obj):
    return CatSchema()


class PetSchema(Schema):
    pet = PolyField(
        serialization_schema_selector=_schema_selector,
        deserialization_schema_selector=_schema_selector,
    )


def test_polyfield_serializes_nested_object():
    result = PetSchema().dump(Pet(pet=Cat(name="Tom")))
    assert result["pet"]["name"] == "Tom"
