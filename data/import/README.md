# UBnux Business Import

`BUSINESSES.JSON` is the production bulk-import file. Put only real business records in that file.

## Required fields

```json
{
  "Business_Title": "Business Name",
  "Business_Id": "B00001",
  "District_Id": "D001",
  "Category_Id": "C0001"
}
```

## Recommended fields

```json
{
  "Business_Title": "Business Name",
  "Business_Id": "B00001",
  "District_Id": "D001",
  "Category_Id": "C0001",
  "Business_Slug": "business-name",
  "Business_Rating": 4.5,
  "Business_Review": 25,
  "Business_Status": "Verified",
  "Business_Keywords": ["keyword 1", "keyword 2"],
  "Business_Owner": "Owner Name",
  "Business_Mobile": "+91XXXXXXXXXX",
  "Business_WhatsApp": "+91XXXXXXXXXX",
  "Business_Email": "hello@example.com",
  "Business_Address": "Full address",
  "Business_Area": "Area",
  "Business_Pincode": "841226",
  "Business_Description": "Short business description",
  "Business_Logo": "https://example.com/logo.jpg",
  "Business_Cover": "https://example.com/cover.jpg"
}
```

## Important rules

1. `Business_Id`, `District_Id` and `Category_Id` must already exist in the master JSON files.
2. `Business_Id` must be globally unique.
3. `Business_Slug` must be globally unique. If omitted, UBnux generates it from `Business_Title`.
4. `Business_Seo_Url` should **not** be manually entered. The import script generates the canonical production URL from the master state, district and category data.
5. Do not add test/dummy businesses to the production import file.
6. The import is append-only for safety. Existing IDs/slugs cause the workflow to fail instead of silently overwriting data.
7. After import, GitHub Actions automatically rebuilds district indexes, generates `sitemap.xml`, and validates SEO relationships.

## Example

```json
[
  {
    "Business_Title": "Example Fashion Store",
    "Business_Id": "B10001",
    "District_Id": "D001",
    "Category_Id": "C0001",
    "Business_Slug": "example-fashion-store",
    "Business_Rating": 4.6,
    "Business_Review": 31,
    "Business_Status": "Verified",
    "Business_Keywords": ["fashion shop", "clothing store", "siwan fashion"],
    "Business_Address": "Example Market, Siwan, Bihar",
    "Business_Pincode": "841226"
  }
]
```

Replace the example with real records before committing production data. Keep `BUSINESSES.JSON` as `[]` when there is no business data to import.
