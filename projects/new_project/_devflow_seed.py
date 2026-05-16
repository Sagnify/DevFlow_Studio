import sqlite3
try:
    c = sqlite3.connect('D:/Codes/DevFlow_Studio/projects/new_project/app.db')
    c.executemany('INSERT INTO tasks (user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [[1, 'do adipiscing', 'lorem ipsum dolor sit amet consectetur adipiscing', 'banned', 'priority_240', '2024-09-25T17:51:34.682Z', '2025-07-06T17:51:34.687Z', '2026-02-27T17:51:34.687Z', '2024-01-13T17:51:34.687Z'], [2, 'consectetur elit', 'lorem ipsum dolor sit amet consectetur', 'inactive', 'priority_431', '2025-03-09T17:51:34.687Z', '2024-07-02T17:51:34.687Z', '2024-11-10T17:51:34.687Z', '2023-12-22T17:51:34.687Z'], [3, 'ipsum do', 'lorem ipsum dolor sit amet consectetur', 'inactive', 'priority_267', '2024-02-19T17:51:34.687Z', '2024-05-08T17:51:34.687Z', '2024-02-07T17:51:34.687Z', '2024-12-11T17:51:34.687Z'], [4, 'dolor consectetur', 'lorem ipsum dolor sit amet consectetur adipiscing elit sed', 'active', 'priority_312', '2024-07-24T17:51:34.687Z', '2026-04-08T17:51:34.687Z', '2025-01-27T17:51:34.687Z', '2023-08-11T17:51:34.687Z'], [5, 'elit do', 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do', 'pending', 'priority_46', '2023-10-23T17:51:34.687Z', '2025-01-19T17:51:34.687Z', '2025-12-17T17:51:34.687Z', '2026-03-17T17:51:34.687Z']])
    c.commit()
    c.close()
    print('__SEED_OK__ 5 rows inserted into tasks')
except Exception as e:
    print('__SEED_ERR__ ' + str(e))
print('__DEVFLOW_SEED_DONE__')
