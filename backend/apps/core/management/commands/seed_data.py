"""Comando para popular dados de exemplo no Repositório Digital CAVN."""

import io
import os
import random
import secrets
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image

from apps.academic.models import ProducaoAcademica
from apps.categories.models import Categoria
from apps.core.constants import DocumentStatus, FileType, UserRole
from apps.core.utils import calculate_sha256, generate_unique_slug
from apps.documents.models import (
    Arquivo,
    Autor,
    Document,
    DocumentoAutor,
    DocumentoCategoria,
    DocumentoTag,
)
from apps.gallery.models import Album, Foto
from apps.system_config.models import Configuracao
from apps.tags.models import Tag
from apps.timeline.models import TimelineEvent
from apps.users.models import User


def _generate_password(role):
    """Gera uma senha forte aleatória para usuários de exemplo."""
    env_var = f"SEED_{role.upper()}_PASSWORD"
    return os.getenv(env_var) or secrets.token_urlsafe(16)


def _random_date(start_year=1950, end_year=2024):
    """Gera uma data aleatória dentro de um intervalo de anos."""
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def _generate_image(color):
    """Gera uma imagem JPEG dummy com cor sólida."""
    img = Image.new("RGB", (800, 600), color=color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)
    return buffer


class Command(BaseCommand):
    help = "Popula o banco com dados de exemplo para desenvolvimento"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove dados existentes antes de inserir",
        )
        parser.add_argument(
            "--documents",
            type=int,
            default=25,
            help="Quantidade de documentos a criar (padrão: 25)",
        )

    def handle(self, *args, **options):
        reset = options["reset"]
        self.document_count = options["documents"]

        if reset:
            self.stdout.write("Removendo dados existentes...")
            Foto.objects.all().delete()
            Album.objects.all().delete()
            TimelineEvent.objects.all().delete()
            ProducaoAcademica.objects.all().delete()
            DocumentoTag.objects.all().delete()
            DocumentoCategoria.objects.all().delete()
            DocumentoAutor.objects.all().delete()
            Document.objects.all().delete()
            Categoria.objects.all().delete()
            Tag.objects.all().delete()
            Autor.objects.all().delete()
            User.objects.filter(
                email__in=[
                    "admin@cavn.ufpb.br",
                    "curador@cavn.ufpb.br",
                    "catalogador@cavn.ufpb.br",
                ]
            ).delete()

        with transaction.atomic():
            self._create_users()
            self._create_categories()
            self._create_tags()
            self._create_authors()
            self._create_documents()
            self._create_timeline()
            self._create_gallery()
            self._create_academic()
            self._create_settings()

        self.stdout.write(self.style.SUCCESS("Dados de exemplo criados com sucesso!"))

    def _create_users(self):
        created_users = []

        admin_password = _generate_password("admin")
        admin, admin_created = User.objects.get_or_create(
            email="admin@cavn.ufpb.br",
            defaults={
                "username": "admin",
                "first_name": "Administrador",
                "last_name": "CAVN",
                "role": UserRole.ADMINISTRATOR,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if admin_created:
            admin.set_password(admin_password)
            admin.save()
            created_users.append((admin.email, admin_password))

        curador_password = _generate_password("curador")
        curador, curador_created = User.objects.get_or_create(
            email="curador@cavn.ufpb.br",
            defaults={
                "username": "curador",
                "first_name": "Maria",
                "last_name": "Curadora",
                "role": UserRole.CURATOR,
            },
        )
        if curador_created:
            curador.set_password(curador_password)
            curador.save()
            created_users.append((curador.email, curador_password))

        catalogador_password = _generate_password("catalogador")
        catalogador, catalogador_created = User.objects.get_or_create(
            email="catalogador@cavn.ufpb.br",
            defaults={
                "username": "catalogador",
                "first_name": "João",
                "last_name": "Catalogador",
                "role": UserRole.CATALOGUER,
            },
        )
        if catalogador_created:
            catalogador.set_password(catalogador_password)
            catalogador.save()
            created_users.append((catalogador.email, catalogador_password))

        self.stdout.write("  - Usuários criados")
        if created_users:
            self.stdout.write(self.style.WARNING("  - Credenciais de exemplo geradas:"))
            for email, password in created_users:
                self.stdout.write(f"      {email} / {password}")
            self.stdout.write(
                self.style.WARNING(
                    "  - IMPORTANTE: altere essas senhas após o primeiro acesso. "
                    "Você pode defini-las previamente via SEED_ADMIN_PASSWORD, "
                    "SEED_CURADOR_PASSWORD e SEED_CATALOGADOR_PASSWORD."
                )
            )

    def _create_categories(self):
        categorias = [
            {
                "nome": "Documentos Textuais",
                "slug": "documentos-textuais",
                "descricao": "Atas, relatórios e correspondências",
                "ordem": 1,
            },
            {
                "nome": "Fotografias Históricas",
                "slug": "fotografias-historicas",
                "descricao": "Registros fotográficos do acervo",
                "ordem": 2,
            },
            {
                "nome": "Documentos Administrativos",
                "slug": "documentos-administrativos",
                "descricao": "Documentos da administração institucional",
                "ordem": 3,
            },
            {
                "nome": "Produção Acadêmica",
                "slug": "producao-academica",
                "descricao": "Teses, dissertações, artigos e TCCs",
                "ordem": 4,
            },
            {
                "nome": "Documentos Pedagógicos",
                "slug": "documentos-pedagogicos",
                "descricao": "Materiais didáticos e pedagógicos",
                "ordem": 5,
            },
            {
                "nome": "Atas",
                "slug": "atas",
                "descricao": "Atas de reuniões e fundação",
                "pai": "documentos-textuais",
                "ordem": 1,
            },
            {
                "nome": "Relatórios",
                "slug": "relatorios",
                "descricao": "Relatórios anuais e de atividades",
                "pai": "documentos-textuais",
                "ordem": 2,
            },
            {
                "nome": "Correspondências",
                "slug": "correspondencias",
                "descricao": "Cartas oficiais e memorandos",
                "pai": "documentos-textuais",
                "ordem": 3,
            },
            {
                "nome": "Cerimônias",
                "slug": "cerimonias",
                "descricao": "Fotos de eventos e solenidades",
                "pai": "fotografias-historicas",
                "ordem": 1,
            },
            {
                "nome": "Infraestrutura",
                "slug": "infraestrutura",
                "descricao": "Imagens do campus e instalações",
                "pai": "fotografias-historicas",
                "ordem": 2,
            },
        ]

        pai_map = {}
        for cat in categorias:
            pai_slug = cat.pop("pai", None)
            c, _ = Categoria.objects.get_or_create(slug=cat["slug"], defaults=cat)
            if pai_slug:
                pai_map[c.slug] = pai_slug

        for slug, pai_slug in pai_map.items():
            cat = Categoria.objects.get(slug=slug)
            cat.parent = Categoria.objects.get(slug=pai_slug)
            cat.save()

        self.stdout.write("  - Categorias criadas")

    def _create_tags(self):
        nomes = [
            "fundacao",
            "1960",
            "documento-oficial",
            "formatura",
            "campus",
            "bananeiras",
            "ufpb",
            "direcao",
            "professores",
            "alunos",
            "curso-tecnico",
            "agricultura",
            "pecuaria",
            "expediente",
            "aniversario",
            "reforma",
            "pesquisa",
            "extensao",
            "ensino",
            "biblioteca",
        ]
        for nome in nomes:
            Tag.objects.get_or_create(slug=nome, defaults={"nome": nome.replace("-", " ").title()})
        self.stdout.write("  - Tags criadas")

    def _create_authors(self):
        nomes = [
            "Direção do CAVN",
            "Prof. José Vidal de Negreiros",
            "Profª. Maria da Conceição",
            "Secretaria Acadêmica",
            "Arquivo Institucional",
            "Comissão de Formatura",
            "Coordenação de Pesquisa",
            "Associação de Ex-alunos",
            "Prefeitura de Bananeiras",
            "Reitoria da UFPB",
        ]
        for nome in nomes:
            Autor.objects.get_or_create(nome=nome)
        self.stdout.write("  - Autores criados")

    def _create_documents(self):
        admin = User.objects.get(email="admin@cavn.ufpb.br")
        curador = User.objects.get(email="curador@cavn.ufpb.br")
        catalogador = User.objects.get(email="catalogador@cavn.ufpb.br")

        tipos = [
            ("ata", "Ata"),
            ("relatorio", "Relatório"),
            ("correspondencia", "Correspondência"),
            ("fotografia", "Fotografia"),
            ("documento_administrativo", "Documento Administrativo"),
            ("producao_academica", "Produção Acadêmica"),
            ("documento_pedagogico", "Documento Pedagógico"),
            ("outro", "Outro"),
        ]

        precisoes = ["dia", "mes", "ano", "decada", "seculo", "desconhecida"]
        status_pool = list(DocumentStatus.values)
        categorias = list(Categoria.objects.all())
        tags = list(Tag.objects.all())
        autores = list(Autor.objects.all())

        titulos_base = [
            "Ata da reunião de {ano}",
            "Relatório de atividades {ano}",
            "Correspondência oficial de {ano}",
            "Registro fotográfico do evento de {ano}",
            "Documento administrativo {ano}",
            "Produção acadêmica {ano}",
            "Material didático {ano}",
            "Memorando interno {ano}",
            "Portaria {ano}",
            "Termo de compromisso {ano}",
        ]

        for i in range(self.document_count):
            tipo, tipo_label = random.choice(tipos)
            ano = random.randint(1955, 2024)
            titulo = random.choice(titulos_base).format(ano=ano)
            if Document.objects.filter(titulo=titulo).exists():
                titulo = f"{titulo} ({i + 1})"

            slug = generate_unique_slug(Document, titulo)
            data_doc = _random_date(ano, ano)
            # Garante que a maioria dos documentos de exemplo seja publicada,
            # para que o site tenha conteúdo visível no frontend.
            status = (
                DocumentStatus.PUBLISHED
                if i < int(self.document_count * 0.6)
                else random.choice([s for s in status_pool if s != DocumentStatus.PUBLISHED])
            )
            created_by = random.choice([admin, catalogador])

            doc = Document.objects.create(
                titulo=titulo,
                slug=slug,
                descricao=f"{tipo_label} do acervo do CAVN referente ao ano de {ano}.",
                resumo=f"Resumo do {tipo_label.lower()} de {ano}.",
                codigo_referencia=f"CAVN-{tipo.upper()}-{ano}-{i + 1:03d}",
                tipo_documento=tipo,
                status=status,
                data_documento=data_doc,
                data_precisao=random.choice(precisoes),
                cobertura_temporal=str(ano),
                cobertura_espacial=random.choice(["Bananeiras, Paraíba", "Campus CAVN", "UFPB"]),
                idioma="pt-BR",
                direitos="Domínio público / CAVN-UFPB",
                fonte=random.choice(
                    ["Arquivo da Direção do CAVN", "Acervo da Biblioteca", "Arquivo Pessoal"]
                ),
                relacao=random.choice(
                    ["", "Faz parte do acervo histórico", "Documento relacionado à administração"]
                ),
                created_by=created_by,
                aprovado_por=curador if status == DocumentStatus.PUBLISHED else None,
            )

            # Vincula 1-3 categorias
            for cat in random.sample(categorias, min(random.randint(1, 3), len(categorias))):
                DocumentoCategoria.objects.get_or_create(documento=doc, categoria=cat)

            # Vincula 1-4 tags
            for tag in random.sample(tags, min(random.randint(1, 4), len(tags))):
                DocumentoTag.objects.get_or_create(documento=doc, tag=tag)

            # Vincula 1-2 autores
            for autor in random.sample(autores, min(random.randint(1, 2), len(autores))):
                DocumentoAutor.objects.get_or_create(
                    documento=doc, autor=autor, defaults={"tipo_autoria": "autor"}
                )

            # Cria capa para ~70% dos documentos publicados
            if status == DocumentStatus.PUBLISHED and random.random() < 0.7:
                self._create_document_cover(doc)

        self.stdout.write(f"  - {self.document_count} documentos criados")

    def _create_document_cover(self, documento):
        color = (
            random.randint(30, 120),
            random.randint(30, 120),
            random.randint(30, 120),
        )
        buffer = _generate_image(color)
        filename = f"capa-{documento.slug}.jpg"
        content = ContentFile(buffer.read(), name=filename)
        checksum = calculate_sha256(content)

        Arquivo.objects.get_or_create(
            documento=documento,
            nome_original=filename,
            defaults={
                "nome_armazenado": filename,
                "arquivo": content,
                "mime_type": "image/jpeg",
                "tamanho_bytes": content.size,
                "checksum_sha256": checksum,
                "largura": 800,
                "altura": 600,
                "tipo_arquivo": FileType.ORIGINAL,
            },
        )

    def _create_timeline(self):
        eventos = [
            ("Fundação do CAVN", "1960-03-15", True),
            ("Inauguração do primeiro prédio", "1962-08-20", True),
            ("Primeira turma de técnicos agrícolas", "1965-12-10", False),
            ("Criação do curso superior", "1980-06-30", True),
            ("Reforma do campus", "1995-11-05", False),
            ("Cinquentenário do CAVN", "2010-03-15", True),
            ("Lançamento do repositório digital", "2024-06-01", True),
        ]

        documentos = list(Document.objects.filter(status=DocumentStatus.PUBLISHED))

        for titulo, data_str, destaque in eventos:
            doc = random.choice(documentos) if documentos and random.random() < 0.4 else None
            TimelineEvent.objects.get_or_create(
                titulo=titulo,
                defaults={
                    "descricao": f"Evento histórico: {titulo}.",
                    "data_evento": data_str,
                    "data_precisao": "dia",
                    "destaque": destaque,
                    "documento": doc,
                    "ordem": random.randint(0, 100),
                },
            )
        self.stdout.write("  - Eventos da timeline criados")

    def _create_gallery(self):
        albuns = [
            ("Inauguração 1965", "Fotografias da inauguração do campus em 1965."),
            ("Formaturas", "Registros de colação de grau ao longo das décadas."),
            ("Campus Histórico", "Evolução das instalações do CAVN."),
            ("Eventos Acadêmicos", "Palestras, congressos e seminários."),
        ]

        for titulo, descricao in albuns:
            album, _ = Album.objects.get_or_create(
                slug=generate_unique_slug(Album, titulo),
                defaults={
                    "titulo": titulo,
                    "descricao": descricao,
                    "destaque": random.choice([True, False]),
                },
            )

            for i in range(random.randint(3, 6)):
                color = (
                    random.randint(50, 200),
                    random.randint(50, 200),
                    random.randint(50, 200),
                )
                buffer = _generate_image(color)
                filename = f"{album.slug}-foto-{i + 1}.jpg"
                foto = Foto.objects.create(
                    album=album,
                    legenda=f"{titulo} - foto {i + 1}",
                    ordem=i,
                )
                foto.imagem.save(filename, ContentFile(buffer.read()), save=True)

        self.stdout.write("  - Galeria criada")

    def _create_academic(self):
        tipos = ["dissertacao", "tese", "artigo", "tcc", "livro", "capitulo", "outro"]
        titulos_base = [
            "A agricultura familiar no Brejo paraibano",
            "Manejo sustentável de solos no Agreste",
            "História da educação agrícola na Paraíba",
            "Inovação tecnológica no ensino técnico rural",
            "A pecuária leiteira em Bananeiras",
            "Diagnóstico socioeconômico de produtores rurais",
            "Políticas públicas para o desenvolvimento rural",
        ]

        for i in range(10):
            titulo = random.choice(titulos_base)
            if ProducaoAcademica.objects.filter(titulo=titulo).exists():
                titulo = f"{titulo} ({i + 1})"

            slug = generate_unique_slug(ProducaoAcademica, titulo)
            ProducaoAcademica.objects.create(
                titulo=titulo,
                slug=slug,
                tipo=random.choice(tipos),
                autor=random.choice(
                    ["João da Silva", "Maria Oliveira", "Pedro Souza", "Ana Santos"]
                ),
                orientador=random.choice(
                    ["Prof. Dr. Carlos Lima", "Profª. Dra. Fernanda Rocha", ""]
                ),
                ano=random.randint(1980, 2024),
                resumo="Resumo da produção acadêmica gerada automaticamente para testes.",
                palavras_chave="educação, agricultura, desenvolvimento rural",
                url_acesso=random.choice(["", "https://repositorio.ufpb.br"]),
                citacao_abnt="",
                ativo=random.choice([True, True, False]),
            )

        self.stdout.write("  - Produções acadêmicas criadas")

    def _create_settings(self):
        defaults = [
            {
                "chave": "site.titulo",
                "valor": "Repositório Digital CAVN",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "Título exibido no cabeçalho e SEO do site.",
            },
            {
                "chave": "site.subtitulo",
                "valor": "Memória institucional do Colégio Agrícola Vidal de Negreiros",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "Subtítulo exibido na página inicial.",
            },
            {
                "chave": "site.descricao",
                "valor": "Acervo digital que preserva a história do CAVN-UFPB",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "Descrição para SEO e compartilhamento.",
            },
            {
                "chave": "site.email_contato",
                "valor": "contato@cavn.ufpb.br",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "E-mail de contato exibido no site.",
            },
            {
                "chave": "site.rodape_texto",
                "valor": "© Colégio Agrícola Vidal de Negreiros - UFPB",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "Texto exibido no rodapé.",
            },
            {
                "chave": "site.cor_primaria",
                "valor": "#0369a1",
                "tipo": Configuracao.Tipo.STRING,
                "descricao": "Cor primária do site (hex).",
            },
            {
                "chave": "site.permitir_cadastro_publico",
                "valor": "false",
                "tipo": Configuracao.Tipo.BOOLEAN,
                "descricao": "Permite que visitantes criem contas sem aprovação.",
            },
            {
                "chave": "documentos.itens_por_pagina",
                "valor": "12",
                "tipo": Configuracao.Tipo.INTEGER,
                "descricao": "Quantidade de documentos por página na busca pública.",
            },
            {
                "chave": "documentos.permitir_download",
                "valor": "true",
                "tipo": Configuracao.Tipo.BOOLEAN,
                "descricao": "Permite download de documentos publicados.",
            },
        ]
        for item in defaults:
            Configuracao.objects.get_or_create(chave=item["chave"], defaults=item)
        self.stdout.write("  - Configurações criadas")
