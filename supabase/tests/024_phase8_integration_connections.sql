begin;
select plan(4);

select ok(
  position('ensure_default_board_columns' in pg_get_functiondef('private.ensure_default_board(uuid,uuid)'::regprocedure)) > 0,
  'premium grant seeds the recovered 4-column board'
);
select ok(
  position('/dashboard#comments' in pg_get_functiondef('private.notify_workspace_comment_insert()'::regprocedure)) > 0,
  'mentor comments deep-link to the dashboard comments section'
);
select ok(
  position('/dashboard#where-you-stand' in pg_get_functiondef('private.notify_premium_workspace_change()'::regprocedure)) > 0,
  'university updates deep-link to the dashboard shortlist'
);
select ok(
  position('student_visible' in pg_get_functiondef('private.notify_premium_workspace_change()'::regprocedure)) > 0,
  'staff-only review items do not notify the student'
);

select * from finish();
rollback;
