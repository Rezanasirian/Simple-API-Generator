"""Command line tools.

python -m app.cli create-admin USERNAME PASSWORD
python -m app.cli import-legacy ../config/ApiDoc.json --data-source "Mongo"
"""

import argparse
import json
import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import Base, SessionLocal, init_engine
from app.core.security import hash_password
from app.legacy import convert_api
from app.models import ApiDefinition, DataSource, User


def _session():
    engine = init_engine(get_settings().database_url)
    Base.metadata.create_all(engine)
    return SessionLocal()


def create_admin(args) -> int:
    db = _session()
    user = db.scalar(select(User).where(User.username == args.username))
    if user:
        user.password_hash, user.role, user.is_active = hash_password(args.password), "admin", True
        print(f"Updated user '{args.username}' (now an active admin)")
    else:
        db.add(
            User(username=args.username, password_hash=hash_password(args.password), role="admin")
        )
        print(f"Created admin '{args.username}'")
    db.commit()
    return 0


def import_legacy(args) -> int:
    with open(args.path, encoding="utf-8") as f:
        legacy = json.load(f)

    db = _session()
    ds = db.scalar(select(DataSource).where(DataSource.name == args.data_source))
    if not ds:
        types = {(c.get("database") or {}).get("type") for c in legacy.values()} - {None}
        ds_type = args.type or (types.pop() if len(types) == 1 else None)
        if not ds_type:
            print("Data source not found; pass --type to create it", file=sys.stderr)
            return 1
        ds = DataSource(name=args.data_source, type=ds_type, config={})
        db.add(ds)
        db.flush()
        print(f"Created data source '{ds.name}' ({ds_type}); set its connection in the panel")

    for slug, cfg in legacy.items():
        try:
            definition, warnings = convert_api(slug, cfg, ds.id)
        except Exception as e:
            print(f"skip {slug}: {e}", file=sys.stderr)
            continue
        for w in warnings:
            print(f"warning: {w}", file=sys.stderr)
        existing = db.scalar(select(ApiDefinition).where(ApiDefinition.slug == slug))
        if existing and not args.overwrite:
            print(f"skip {slug}: already exists (use --overwrite)")
            continue
        values = definition.model_dump(mode="json")
        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
            print(f"updated {slug}")
        else:
            db.add(ApiDefinition(**values))
            print(f"imported {slug}")
    db.commit()
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(required=True)

    p = sub.add_parser("create-admin", help="create or reset an admin account")
    p.add_argument("username")
    p.add_argument("password")
    p.set_defaults(func=create_admin)

    p = sub.add_parser("import-legacy", help="import APIs from the old config/ApiDoc.json")
    p.add_argument("path")
    p.add_argument("--data-source", required=True, help="name of the data source to attach APIs to")
    p.add_argument("--type", help="type for the data source if it has to be created")
    p.add_argument("--overwrite", action="store_true")
    p.set_defaults(func=import_legacy)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
