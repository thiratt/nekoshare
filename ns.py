import os
import shutil

def delete_node_modules(start_path='.'):
    deleted_count = 0
    for root, dirs, files in os.walk(start_path, topdown=True):        
        if 'node_modules' in dirs:
            dir_path = os.path.join(root, 'node_modules')
            print(f"Deleting: {dir_path}")
            try:
                shutil.rmtree(dir_path)
                deleted_count += 1
            except Exception as e:
                print(f"Failed to delete {dir_path}: {e}")
            dirs.remove('node_modules')
    print(f"\nDone. Deleted {deleted_count} 'node_modules' folder(s).")

if __name__ == '__main__':
    delete_node_modules()
