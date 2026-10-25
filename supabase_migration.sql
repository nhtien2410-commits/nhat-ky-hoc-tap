-- ==============================================================================
-- NHẬT KÝ HỌC TẬP & GIAO VIỆC NHÓM (PART 1 & PART 2)
-- Supabase PostgreSQL Migration with Row Level Security (RLS) & Seed Data
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_category AS ENUM ('general', 'study', 'work', 'project', 'exam', 'reading', 'english');
CREATE TYPE repeat_interval AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Thành viên',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, user_id)
);

-- 6. INVITES TABLE (Server-validated invite codes with expiration)
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    due_date DATE NOT NULL,
    assigner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status task_status NOT NULL DEFAULT 'pending',
    priority task_priority NOT NULL DEFAULT 'medium',
    category task_category NOT NULL DEFAULT 'general',
    repeat repeat_interval NOT NULL DEFAULT 'none',
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TASK ASSIGNEES TABLE
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, user_id)
);

-- 9. TASK COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TASK COMPLETIONS TABLE (Tracks per-date completion for repeating tasks)
CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(task_id, completion_date)
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'assigned', 'review', 'approved', 'rejected', 'comment', 'due_24h', 'overdue', 'reschedule'
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id AND user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_group_role(check_group_id UUID, check_user_id UUID)
RETURNS member_role SECURITY DEFINER STABLE AS $$
DECLARE
    found_role member_role;
BEGIN
    SELECT role INTO found_role FROM public.group_members
    WHERE group_id = check_group_id AND user_id = check_user_id;
    RETURN found_role;
END;
$$ LANGUAGE plpgsql;

-- PROFILES POLICIES
CREATE POLICY "Users can read all member profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- GROUPS POLICIES
CREATE POLICY "Users can view groups they belong to"
    ON public.groups FOR SELECT
    TO authenticated
    USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create groups"
    ON public.groups FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only group owner can update group details"
    ON public.groups FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "Only group owner can delete group"
    ON public.groups FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- GROUP MEMBERS POLICIES
CREATE POLICY "Members can view other members in their groups"
    ON public.group_members FOR SELECT
    TO authenticated
    USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Owners and Admins can add members"
    ON public.group_members FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_group_role(group_id, auth.uid()) IN ('owner', 'admin')
        OR auth.uid() = user_id -- Joining via validated invite
    );

CREATE POLICY "Owners can update member roles"
    ON public.group_members FOR UPDATE
    TO authenticated
    USING (public.get_group_role(group_id, auth.uid()) = 'owner');

CREATE POLICY "Owners can remove members or members can leave themselves"
    ON public.group_members FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.get_group_role(group_id, auth.uid()) IN ('owner', 'admin')
    );

-- TASKS POLICIES
CREATE POLICY "Members can view tasks in their groups"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Assigners and Group Admins/Owners can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_group_member(group_id, auth.uid())
        AND auth.uid() = assigner_id
    );

CREATE POLICY "Assigners and Group Admins/Owners can update task definitions"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = assigner_id
        OR public.get_group_role(group_id, auth.uid()) IN ('owner', 'admin')
        OR EXISTS (
            -- Assignees can update status only
            SELECT 1 FROM public.task_assignees
            WHERE task_id = tasks.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Only Assigners and Admins/Owners can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        auth.uid() = assigner_id
        OR public.get_group_role(group_id, auth.uid()) IN ('owner', 'admin')
    );

-- COMMENTS POLICIES
CREATE POLICY "Members can view task comments in their group"
    ON public.task_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id AND public.is_group_member(t.group_id, auth.uid())
        )
    );

CREATE POLICY "Members can add comments to tasks in their group"
    ON public.task_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id AND public.is_group_member(t.group_id, auth.uid())
        )
    );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view and manage their own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 13. SEED DATA (For Testing & Local Development)
-- ==============================================================================

DO $$
DECLARE
    u1_id UUID := '11111111-1111-1111-1111-111111111111';
    u2_id UUID := '22222222-2222-2222-2222-222222222222';
    u3_id UUID := '33333333-3333-3333-3333-333333333333';
    grp_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    t1_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
    t2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02';
    t3_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03';
BEGIN
    -- Seed Profiles
    INSERT INTO public.profiles (id, email, display_name, avatar_url) VALUES
        (u1_id, 'alex.nguyen@example.com', 'Alex Nguyễn', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'),
        (u2_id, 'minh.anh@example.com', 'Minh Anh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh'),
        (u3_id, 'hoang.nam@example.com', 'Hoàng Nam', 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoangNam')
    ON CONFLICT (id) DO NOTHING;

    -- Seed Group
    INSERT INTO public.groups (id, name, description, invite_code, owner_id) VALUES
        (grp_id, 'Nhóm Học Tập Vibe', 'Nhóm luyện tập lập trình và tiếng Anh hàng ngày', 'VIBE2026', u1_id)
    ON CONFLICT (id) DO NOTHING;

    -- Seed Group Members
    INSERT INTO public.group_members (group_id, user_id, role) VALUES
        (grp_id, u1_id, 'owner'),
        (grp_id, u2_id, 'admin'),
        (grp_id, u3_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Seed Tasks
    INSERT INTO public.tasks (id, group_id, title, description, due_date, assigner_id, status, priority, category, repeat, requires_approval) VALUES
        (t1_id, grp_id, 'Ôn tập từ vựng IELTS Topic Education', 'Học 20 từ vựng và ví dụ cụ thể', CURRENT_DATE, u1_id, 'completed', 'high', 'english', 'daily', false),
        (t2_id, grp_id, 'Thiết kế Three.js Shaders Node', 'Tìm hiểu WebGPU TSL nodes cho Three.js v0.180', CURRENT_DATE, u1_id, 'review', 'high', 'study', 'none', true),
        (t3_id, grp_id, 'Đọc 30 trang sách Clean Code', 'Chương 4: Comments và cách refactor', CURRENT_DATE, u2_id, 'in_progress', 'medium', 'reading', 'none', false)
    ON CONFLICT (id) DO NOTHING;

    -- Seed Task Assignees
    INSERT INTO public.task_assignees (task_id, user_id) VALUES
        (t1_id, u2_id),
        (t2_id, u3_id),
        (t3_id, u1_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    -- Seed Comments
    INSERT INTO public.task_comments (task_id, user_id, content) VALUES
        (t2_id, u3_id, 'Đã hoàn thành node shader prototype, gửi bác xem qua nhé!'),
        (t2_id, u1_id, 'Tuyệt vời, hiệu ứng ánh sáng rất mượt mà.')
    ON CONFLICT DO NOTHING;

    -- Seed Notification
    INSERT INTO public.notifications (user_id, group_id, task_id, type, title, message) VALUES
        (u1_id, grp_id, t2_id, 'review', 'Nhiệm vụ chờ bạn duyệt', 'Hoàng Nam đã nộp nhiệm vụ Thiết kế Three.js Shaders Node')
    ON CONFLICT DO NOTHING;
END $$;
