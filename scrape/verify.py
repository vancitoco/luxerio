import pandas as pd

df = pd.read_csv('shopify_import_ready.csv')

size_counts = df.groupby('URL handle')['Option1 value'].count()
all_sizes = df.groupby('URL handle')['Option1 value'].apply(list)

true_fallbacks = []
for handle, sizes in all_sizes.items():
    if sizes == ['38']:
        true_fallbacks.append(handle)

print('TRUE fallbacks (only size is 38):', true_fallbacks)
print()
print(f"{'Product':<48} {'#sizes':<8} Sizes")
print('-' * 90)
for _, row in df[df['Title'].notna()].iterrows():
    handle = row['URL handle']
    count = size_counts[handle]
    szlist = ', '.join(str(s) for s in all_sizes[handle])
    print(f"{str(row['Title'])[:47]:<48} {count:<8} {szlist[:60]}")
