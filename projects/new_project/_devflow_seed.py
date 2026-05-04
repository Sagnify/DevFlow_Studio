import sqlite3
try:
    c = sqlite3.connect('D:/Codes/DevFlow_Studio/projects/new_project/app.db')
    c.executemany('INSERT INTO address (address, user_id) VALUES (?, ?)', [['439 Pine Blvd', 1], ['514 Main St', 2], ['810 Cedar Ln', 3], ['863 Oak Ave', 4], ['586 Maple Rd', 5]])
    c.commit()
    c.close()
    print('__SEED_OK__ 5 rows inserted into address')
except Exception as e:
    print('__SEED_ERR__ ' + str(e))
print('__DEVFLOW_SEED_DONE__')
