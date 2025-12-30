# Datenbank-Migrationen ausführen

## Wichtige Migrationen, die manuell ausgeführt werden müssen:

### Migration 0007: Storage & Update Policies

Diese Migration fügt hinzu:
- Storage Bucket `station-assets` für Station-Wappen/Logos
- RLS Policies für Storage (nur ADMINs können hochladen)
- Update Policy für `stations` Tabelle (ADMINs können Namen und Wappen ändern)
- Erweiterte `people` Policies (EDITORs können auch Personen verwalten)

**So ausführen:**
1. Gehe zu deinem Supabase Dashboard
2. Navigiere zu "SQL Editor"
3. Kopiere den Inhalt von `supabase/migrations/0007_add_storage_and_update_policies.sql`
4. Füge ihn ein und führe ihn aus

### Migration 0008: Mehrere Divisionen für EDITORs

Diese Migration fügt hinzu:
- `division_ids` Array-Feld in `memberships` Tabelle
- Neue Funktion `can_edit_division()` zur Prüfung von Berechtigungen
- Aktualisierte RLS Policies für `shifts`, `assignments` und `shift_notes`
- Erlaubt ADMINs, EDITORs mehrere Divisionen zuzuweisen

**So ausführen:**
1. Gehe zu deinem Supabase Dashboard
2. Navigiere zu "SQL Editor"
3. Kopiere den Inhalt von `supabase/migrations/0008_add_multiple_divisions_support.sql`
4. Füge ihn ein und führe ihn aus

### Migration 0006: Timestamp-Fix (bereits erstellt)

Diese Migration ändert:
- `shifts.starts_at` und `shifts.ends_at` von `timestamptz` zu `timestamp`
- Konvertiert bestehende Daten von UTC zu lokaler Zeit (Europe/Berlin)

**So ausführen:**
1. Gehe zu deinem Supabase Dashboard
2. Navigiere zu "SQL Editor"
3. Kopiere den Inhalt von `supabase/migrations/0006_change_shifts_timestamp_to_local.sql`
4. Füge ihn ein und führe ihn aus

## Reihenfolge der Ausführung:

1. Migration 0006 (Timestamp-Fix)
2. Migration 0007 (Storage & Policies)
3. Migration 0008 (Mehrere Divisionen)

## Nach der Migration:

### Storage Bucket prüfen:
- Gehe zu "Storage" im Supabase Dashboard
- Prüfe, ob der Bucket `station-assets` existiert
- Stelle sicher, dass er als "Public" markiert ist

### Rollensystem testen:

#### Als ADMIN:
- ✅ Station-Einstellungen bearbeiten (Name, Wappen hochladen)
- ✅ Fahrzeuge, Divisionen, Personen verwalten
- ✅ Alle Dienstpläne erstellen/bearbeiten
- ✅ Benutzer verwalten und Rollen zuweisen
- ✅ EDITORs Divisionen zuweisen

#### Als EDITOR:
- ✅ Personen hinzufügen/bearbeiten
- ✅ Dienstpläne für zugewiesene Divisionen erstellen/bearbeiten
- ❌ Keine Station-Einstellungen
- ❌ Keine Fahrzeuge/Divisionen erstellen
- ❌ Keine Benutzer verwalten

#### Als VIEWER:
- ✅ Alles lesen
- ❌ Nichts bearbeiten

## Berechtigungsstruktur:

```
ADMIN
  ├─ Station-Einstellungen (Name, Wappen)
  ├─ Fahrzeug-Konfigurationen
  ├─ Divisionen/Wachabteilungen
  ├─ Benutzer & Rollen
  ├─ Personen verwalten
  └─ Alle Dienstpläne (alle Divisionen)

EDITOR
  ├─ Personen verwalten
  └─ Dienstpläne (nur zugewiesene Divisionen)

VIEWER
  └─ Nur Lesen
```

## Neue Features:

### 1. Division-Zuweisung für EDITORs
- ADMINs können in der Benutzerverwaltung (`/admin/users`) EDITORs spezifische Divisionen zuweisen
- Klicke auf den Button in der "Divisionen"-Spalte für einen EDITOR
- Wähle eine oder mehrere Divisionen aus
- Der EDITOR kann dann nur Dienstpläne für diese Divisionen erstellen/bearbeiten

### 2. Station-Wappen Upload
- ADMINs können in den Einstellungen (`/admin/settings`) ein Wappen/Logo hochladen
- Das Bild wird automatisch in Supabase Storage gespeichert
- Das Wappen wird im Display-View angezeigt

## Troubleshooting:

### "new row violates row-level security policy" beim Upload
- Stelle sicher, dass Migration 0007 ausgeführt wurde
- Prüfe, ob der `station-assets` Bucket existiert
- Prüfe, ob der eingeloggte Benutzer ADMIN-Rolle hat

### EDITORs können keine Dienstpläne bearbeiten
- Stelle sicher, dass Migration 0008 ausgeführt wurde
- Prüfe, ob dem EDITOR Divisionen zugewiesen wurden
- Gehe zu `/admin/users` und weise dem EDITOR Divisionen zu

### Schichten laufen nicht weiter
- Führe Migration 0006 aus
- Prüfe die Zeiten in der Datenbank (sollten ohne Timezone sein)
