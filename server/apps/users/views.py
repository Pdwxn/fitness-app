from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserProfileSerializer


class MeView(APIView):
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class SyncUserView(APIView):
    def post(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
